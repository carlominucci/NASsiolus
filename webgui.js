var express = require('express');
var session = require('express-session');
const expressSanitizer = require('express-sanitizer');
var fs = require('fs');
var https = require('https');
var app = express();
var bodyParser = require("body-parser");
var network = require('network-config');
var os = require('os');
var path = require('path');
var crypto = require('crypto');
var checkDiskSpace = require('check-disk-space');
var split = require('split');
var exec = require('child_process').exec;

var port = "11235";
var freespace = new String();
var totalspace = new String();
var workgroup = new String();
var share = new String();
var user = new String();
var sambaconfnew;
var ip;
var netmask;
var gateway;
var sess;

app.use(expressSanitizer());
app.use(session({
    secret: '2C44-4D44-WppQ38S',
    resave: true,
    saveUninitialized: true
}));

const headerhtml = fs.readFileSync("./header.html");
const footerhtml = fs.readFileSync("./footer.html");
var writesaved = headerhtml + '<div class="action">\n' + 'Saved.\n' + '<form action="/admin" method="post">\n' + '<button class="bottone" >Back</button>\n' + '</form>\n' + '</div>\n' + footerhtml;

function poweroff(callback){
	exec('poweroff', function(error, stdout, stderr){ callback(stdout); });
}
function reboot(callback){
	exec('reboot', function(error, stdout, stderr){ callback(stdout); });
}

checkDiskSpace('/').then((diskSpace) => {
	freespace=diskSpace.free;
	totalspace=diskSpace.size;
});

function networkdata(callback){
  network.interfaces(function(err, interfaces){
		ip = interfaces[0].ip;
		netmask = interfaces[0].netmask;
		gateway = interfaces[0].gateway;
  });
}

network.interfaces(function(err, interfaces){
  ip = interfaces[0].ip;
  netmask = interfaces[0].netmask;
  gateway = interfaces[0].gateway;
  console.log('https://' + ip + ':11235');
});

function sambaitem(callback){
  var smbconf = fs.readFileSync('/etc/samba/smb.conf', 'utf8');
  var line = smbconf.split("\n");
  for (i = 0; i < line.length; i++) {
    var tmp = line[i].split("=");
    if(tmp[0].trim() == "workgroup"){
      workgroup=(tmp[1].trim());
    }
    if(tmp[0].trim() == "valid users"){
      user=(tmp[1].trim());
    }
    if(tmp[0].match(/\[*\]/) && !tmp[0].match(/\[global\]/)){
      share=(tmp[0].replace(/[\[\]]/g, ''));
    }
  }
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
  sambaitem();
	//networkdata();
	res.set('Content-Type', 'text/html');
	res.write(headerhtml);
	res.write('<div class="box">\n');
	res.write('<h1>NASsiolus - ' + os.hostname + ' </h1><br />\n');
  res.write('smb://' + ip + '/' + share + '<br /><br />');
  res.write('Password:<br /><form action="admin" method="post">');
  res.write('<input type="password" name="password" />\n');
  res.write('<button class="bottone">Login</button>\n');
  res.write('</form>\n');

	res.write('</div>\n');
	res.end(footerhtml);
});

app.get('/newusername', function(req, res){
	response = {
		username: req.sanitize(req.query.username),
		password: req.sanitize(req.query.password)
	};

	var etcpasswd = fs.readFileSync('/etc/passwd', 'utf8');
  if(etcpasswd.indexOf('NASsiolus user') >= 0){
    var line = etcpasswd.split("\n");
    for (i = 0; i < line.length; i++) {
      if(line[i].indexOf('NASsiolus user')  >= 0 ){
        var tmp = line[i].split(":");
        var username = tmp[0];
        exec('smbpasswd -x ' + tmp[0]);
        exec('deluser ' + tmp[0]);
      }
    }
		exec('sleep 1; adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + response.username);
		exec('(echo "' + response.password + '"; echo "' + response.password + '") | smbpasswd -a ' + response.username);
    exec('chwon -R ' + response.username + ' /srv/NASsiolus_share');
	}else if(etcpasswd.indexOf('NASsiolus user') < 0){
		exec('adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + response.username);
    exec('(echo "' + response.password + '"; echo "' + response.password + '") | passwd ' + response.username)
		exec('(echo "' + response.password + '"; echo "' + response.password + '") | smbpasswd -a ' + response.username);
    exec('chwon -R ' + response.username + ' /srv/NASsiolus_share');
 	}
  var smbconf = fs.readFileSync('/etc/samba/smb.conf', 'utf8');
  var smbcontfmp;
  var line = smbconf.split("\n");
  for (i = 0; i < line.length; i++) {
    if(line[i].indexOf('valid users') >= 0){
        smbcontfmp += 'valid users = ' + response.username + '\n';
    }else{
        smbcontfmp += line[i] + '\n';
    }
  }

  res.set('Content-Type', 'text/html');
  res.write(headerhtml)
  res.write('<div class="box">\n');
  res.write(writesaved);
  res.write('</div>');
  res.end(footerhtml);
});

app.get('/changepwd', function(req, res){
  var contents = fs.readFileSync('./passwd', 'utf8');
  if(contents == crypto.createHash('sha512').update(req.query.oldpassword).digest("hex")){
    fs.writeFile('passwd', crypto.createHash('sha512').update(req.query.newpassword).digest("hex") , function(err){
  		if (err) throw err;
  	});
    res.set('Content-Type', 'text/html');
    res.write(headerhtml)
    res.write('<div class="box">\n');
    res.write(writesaved);
    res.write('</div>');
    res.end(footerhtml);
  }
});

app.get('/saveshare', function(req, res){
	response = {
		workgroup : req.sanitize(req.query.workgroup),
		share : req.sanitize(req.query.share),
		username : req.sanitize(req.query.username),
		oldusername: req.sanitize(req.query.oldusername)
	};
	var etcpasswd = fs.readFileSync('/etc/passwd', 'utf8');
	var line = etcpasswd.split("\n");var contents = fs.readFileSync('./passwd', 'utf8');
	for (i = 0; i < line.length; i++) {
		if(line[i].indexOf('NASsiolus user')  >= 0 ){
			var tmp = line[i].split(":");
			var username = tmp[0];
		}
	}

	sambaconfnew = "[global]\n";
	sambaconfnew += "workgroup = " + response.workgroup + "\n";
	sambaconfnew += "server string = " + response.workgroup + " " + response.share + " - NASsiolus\n";
	sambaconfnew += "server role = standalone server\n";
	sambaconfnew += "log file = /var/log/samba/log.%m\n";
	sambaconfnew += "max log size = 50\n";
	sambaconfnew += "[" + response.share + "]\n";
	sambaconfnew += "comment = " + response.share + " share\n";
	sambaconfnew += "path = /srv/NASsiolus_share\n";
	sambaconfnew += "valid users = " + username + "\n";
	sambaconfnew += "public = yes\n";
	sambaconfnew += "writable = yes\n";
	sambaconfnew += "printable = no\n";
	sambaconfnew += "create mask = 0777\n";
	fs.writeFile('/etc/samba/smb.conf', sambaconfnew, function(err){
		if (err) throw err;
	});
	exec("service samba restart");

	fs.writeFile('/etc/hostname', response.workgroup, function(err){
		if (err) throw err;
	});
	exec("hostname -F /etc/hostname");

	res.set('Content-Type', 'text/html');
  res.write(headerhtml)
  res.write('<div class="box">\n');
	res.write(writesaved);
  res.write('</div>');
  res.end(footerhtml);
});

app.post('/upgrade', function(req, res){
  exec("apk update && apk upgrade",
    function (error, stdout, stderr) {
      res.set('Content-Type', 'text/html');
   	  res.write(headerhtml);
      res.write('<pre>\n');
      res.write(stdout);
      res.write('</pre>\n');
      res.write('<form action="/admin" method="post">\n');
      res.write('<button class="bottone" >Back</button>\n');
      res.write('</form>\n');
      res.end(footerhtml);
  });
});

app.post('/poweroff', function(req, res){
	res.set('Content-Type', 'text/html');
  res.write(headerhtml)
  res.write('<div class="box">\n');
  res.write('Poweroff in progress..');
  res.write('</div>');
  res.end(footerhtml);d3d3d3
	poweroff(function(output){
		console.log("PowerOff");
	});
});

app.post('/reboot', function(req, res){
	res.set('Content-Type', 'text/html');
  res.write(headerhtml)
  res.write('<div class="box">\n');
  res.write('Reboot in progress..');
  res.write('</div>');
  res.end(footerhtml);
	reboot(function(output){
		console.log("Reboot");
	});
});

app.post('/logout', function (req, res) {
  req.session.destroy(function (err) {
  if (err) return next(err)
    res.redirect('/')
  })
});

app.post('/admin', function (req, res, next){
  sess = req.session;
	res.set('Content-Type', 'text/html');
	res.write(headerhtml);

	if(req.body.password){
		var password=req.sanitize(req.body.password);
		var sha512 = crypto.createHash('sha512').update(password).digest("hex");
    var contents = fs.readFileSync('./passwd', 'utf8');
    if(sha512 == contents){
      sess = req.session;
      sess.login=true;
    }else{
      sess.login=false;
    }
	}

	if(sess.login == true){
    sambaitem();
		networkdata();

    res.write('<div class="titlebox">' + workgroup + ' - ' + share + '</div>\n');
		res.write('<div class="box">\n');
    res.write('<h1>Info</h1><br />\n');
		res.write('<b> ' + os.hostname + ': </b>');
    if(!ip){
      res.write('<i>Press Refresh button</i>');
    }else if (ip){
      res.write(ip);
    }
    res.write('<br />\n');
		res.write('<b>Os: </b>' + os.type +  ' ' + os.release() + ' ' + os.arch() + '<br />\n');
    var hours = Math.floor(os.uptime() / (60*60));
    var minutes = Math.floor(os.uptime() % (60*60) / 60);
    var seconds = Math.floor(os.uptime() % 60);
		res.write('<b>Uptime: </b>' + hours + 'h ' + minutes + 'm ' + seconds + 's<br />\n');
    res.write('<b>Load: </b>' + os.loadavg()[0].toFixed(2) + '/' + os.loadavg()[1].toFixed(2) + '/' + os.loadavg()[2].toFixed(2) + '\n');
    res.write('<br /><canvas id="canvasLoad" width="100" height="30" style="border: 1px solid #2196F3; background-color: #fff"></canvas><script>var c = document.getElementById("canvasLoad");var ctx = c.getContext("2d");ctx.beginPath();ctx.lineTo(0,' + (30-((os.loadavg()[0].toFixed(2))*10)) + '); ctx.lineTo(50, ' + (30-((os.loadavg()[1].toFixed(2))*10)) + '); ctx.lineTo(100, ' + (30-((os.loadavg()[2].toFixed(2))*10)) + ');ctx.strokeStyle="#000";ctx.stroke();</script><br />\n');
    var percentmem = os.freemem * 100 / os.totalmem;
		res.write('<b>Memory: </b>' + parseInt((os.totalmem/1024)/1024) + 'Mb total / ' + parseInt((os.freemem/1024)/1024) + 'Mb free - ' + parseInt(percentmem) + '% free\n');
    res.write('<br /><canvas id="myCanvasmem" width="100" height="30" style="border:1px solid #2196F3; background-color: #fff;"></canvas><script>var c = document.getElementById("myCanvasmem");var ctx = c.getContext("2d");ctx.fillRect(0, 0, ' + (100-parseInt(percentmem)) + ', 30);</script><br />\n');
    var percentdisk = freespace * 100 / totalspace;
		res.write('<b>Disk Usage: </b>' + parseInt(((totalspace/1024)/1024)/1024) + 'Gb total / ' + parseInt(((freespace/1024)/1024)/1024) + 'Gb free - ' + parseInt(percentdisk) + '% free.\n');
    res.write('<br /><canvas id="myCanvasdisk" width="100" height="30" style="border:1px solid #2196F3; background-color: #fff;"></canvas><script>var c = document.getElementById("myCanvasdisk");var ctx = c.getContext("2d");ctx.fillRect(0, 0, ' + (100-parseInt(percentdisk)) + ', 30);</script><br />\n');
    res.write('<b>Share: </b>');
    if(!ip){
      res.write('<i>Press Refresh button</i>');
    }else if (ip){
      res.write('smb://');
      res.write(ip);
      res.write('/' + share + '<br />\n');
    }
    //res.write('<b>Connected user:</b>');

    res.write('<form method="post" action="/admin">\n');
    res.write('<button class="bottone">Refresh</button>\n');
		res.write('</form></div>\n');

    var etcpasswd = fs.readFileSync('/etc/passwd', 'utf8');
  	var line = etcpasswd.split("\n");
  	for (i = 0; i < line.length; i++) {
  		if(line[i].indexOf('NASsiolus user')  >= 0 ){
  			var tmp = line[i].split(":");
  			var username = tmp[0];
  		}
  	}

		res.write('<div class="box">\n');
    res.write('<h1>Login parameters.</h1><br />\n');
		res.write('<form action="newusername" method="get">\n');
		res.write('Username:<br /><input type="text" name="username" value="' + username + '" size="20" /><br />\n');
		res.write('Password:<br /><input type="password" name="password" size="20" /><br />\n');
		res.write('<input class="bottone" type="submit" value="Save" />\n');
		res.write('</form>\n');
		res.write('</div>\n');

		res.write('<div class="box" >\n');
    res.write('<h1><i>WorkGroup</i> and <i>Share</i></h1><br />\n');
		res.write('<form action="saveshare" method="get">\n');
		res.write('Workgroup:<br /><input type="text" name="workgroup" value="' + workgroup + '" /><br />\n');
		res.write('Share:<br /><input type="text" name="share" value="' + share + '" /> Share<br />\n');
		res.write('<input type="hidden" name="oldusername" value="' + user + '" />\n');
		res.write('<input class="bottone" type="submit" value="Save" />\n');
		res.write('</form>\n</div>\n');

		res.write('<div class="box">\n');
    res.write('<h1>System</h1><br />\n');
    res.write('Change <i>webgui</i> password.\n');
    res.write('<form action="changepwd" method="get" >\n');
    res.write('<input type="password" name="oldpassword" />Old Password<br />\n');
    res.write('<input type="password" name="newpassword" />New Password<br />\n');
    res.write('<input class="bottone" type="submit" value="Save" />\n');
    res.write('</form>\n');
    res.write('<hr />\n');

    res.write('<form action="logout" method="post">\n');
		res.write('<button class="bottone">Logout</button>\n');
		res.write('</form>\n');

		res.write('<form action="poweroff" method="post">\n');
		res.write('<button class="bottone">PowerOff</button>\n');
		res.write('</form>\n');

		res.write('<form action="reboot" method="post">\n');
		res.write('<button class="bottone">Reboot</button>\n');
		res.write('</form>\n');

    res.write('<form action="upgrade" method="post">\n');
		res.write('<button class="bottone">Upgrade</button>\n');
		res.write('</form>\n');

		res.write('</div>\n');
	}else if(!sess.login == true){
    res.write('<div class="box">\n');
    res.write('Wrong password.<br />');
    res.write('<a href="/">Login</a>\n');
    res.write('</div>');
	}
	res.end(footerhtml);
});

https.createServer({
  	key: fs.readFileSync('/srv/NASsiolus/privatekey.pem'),
  	cert: fs.readFileSync('/srv/NASsiolus/certificate.pem')
}, app)
.listen(port, function () {
  	//console.log('https://' + ip + ':' + port + '\n');

});
