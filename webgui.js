var express = require('express');
var session = require('express-session');
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
//console.log(ip);

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
	res.write('<div id="Info">\n');
	res.write('<h1>NASsiolus - ' + os.hostname + ' </h1>\n');
  res.write('<form action="admin" method="post">');
  res.write('<input type="password" name="password" />\n');
  res.write('<button class="bottone">Login</button>\n');
  res.write('</form>\n</div>\n');
	res.write('<div id="Info">\n');
	res.write('smb://' + ip + '/' + share);
	res.write('</div>\n');
	res.end(footerhtml);
});

app.get('/newusername', function(req, res){
	response = {
		username: req.query.username,
		password: req.query.password
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
		exec('adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + response.username);
		exec('(echo "' + response.password + '"; echo "' + response.password + '") | smbpasswd -a ' + response.username);
    exec('chwon -R ' + response.username + ' /srv/NASsiolus');
	}else if(etcpasswd.indexOf('NASsiolus user') < 0){
		exec('adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + response.username);
    exec('(echo "' + response.password + '"; echo "' + response.password + '") | passwd ' + response.username)
		exec('(echo "' + response.password + '"; echo "' + response.password + '") | smbpasswd -a ' + response.username);
    exec('chwon -R ' + response.username + ' /srv/NASsiolus');
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
	res.write(writesaved);
  res.end();
});

app.get('/changepwd', function(req, res){
  var contents = fs.readFileSync('./passwd', 'utf8');
  if(contents == crypto.createHash('sha512').update(req.query.oldpassword).digest("hex")){
    fs.writeFile('passwd', crypto.createHash('sha512').update(req.query.newpassword).digest("hex") , function(err){
  		if (err) throw err;
  	});
    res.write(writesaved);
    res.end;
  }
});

app.get('/saveshare', function(req, res){
	response = {
		workgroup : req.query.workgroup,
		share : req.query.share,
		username : req.query.username,
		id : req.query.id,
		oldusername: req.query.oldusername
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
	sambaconfnew += "log file = /usr/local/samba/var/log.%m\n";
	sambaconfnew += "max log size = 50\n";
	sambaconfnew += "[" + response.share + "]\n";
	sambaconfnew += "comment = " + response.share + " share\n";ciao
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
	res.write(writesaved);
  res.end();
});

app.post('/poweroff', function(req, res){
	res.set('Content-Type', 'text/html');
	res.write(headerhtml);
	res.write('<div class="System">\n');
	res.write('Poweroff in progress...\n');
	res.write('</div>\n');
	res.end(footerhtml);
	poweroff(function(output){
		console.log("PowerOff");
	});
});

app.post('/reboot', function(req, res){
	res.set('Content-Type', 'text/html');
	res.write(headerhtml);
	res.write('<div class="System">\n');
	res.write('Reboot in progress...\n');
	res.write('</div>\n');
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

app.post('/changeip', function (req,res){
  console.log(req.body.ip);
  console.log(req.body.netmask);
  console.log(req.body.gateway);
  network.configure('eth0', {
    ip: req.body.ip,
    netmask: req.body.netmask,
    gateway: req.body.gateway,
    restart: true
}, function(err){

})
  res.redirect('https://' + req.body.ip + ':11235');
  /*res.set('Content-Type', 'text/html');
	res.write(writesaved);
  res.end();*/
});

app.post('/admin', function (req, res, next){
  sess = req.session;
	res.set('Content-Type', 'text/html');
	res.write(headerhtml);

	if(req.body.password){
		var password=req.body.password;
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

		res.write('<button class="tablink" onclick="openPage(\'Info\', this, \'#ddd\')" id="defaultOpen">Info</button>\n');
    res.write('<button class="tablink" onclick="openPage(\'Account\', this, \'#ddd\')">Account</button>\n');
		res.write('<button class="tablink" onclick="openPage(\'Share\', this, \'#ddd\')">Share</button>\n');
		res.write('<button class="tablink" onclick="openPage(\'System\', this, \'#ddd\')">System</button>\n');

		res.write('<div id="Info" class="tabcontent">');
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
    var percentmem = os.freemem * 100 / os.totalmem;
		res.write('<b>Memory: </b>' + parseInt((os.totalmem/1024)/1024) + 'Mb total / ' + parseInt((os.freemem/1024)/1024) + 'Mb free - ' + parseInt(percentmem) + '% free\n');
    res.write('<canvas id="myCanvasmem" width="100" height="30" style="border:1px solid #d3d3d3; background-color: #fff;"></canvas><script>var c = document.getElementById("myCanvasmem");var ctx = c.getContext("2d");ctx.fillRect(0, 0, ' + (100-parseInt(percentmem)) + ', 30);</script><br >\n');
    var percentdisk = freespace * 100 / totalspace;
		res.write('<b>Disk Usage: </b>' + parseInt(((totalspace/1024)/1024)/1024) + 'Gb total / ' + parseInt(((freespace/1024)/1024)/1024) + 'Gb free - ' + parseInt(percentdisk) + '% free.\n');
    res.write('<canvas id="myCanvasdisk" width="100" height="30" style="border:1px solid #d3d3d3; background-color: #fff;"></canvas><script>var c = document.getElementById("myCanvasdisk");var ctx = c.getContext("2d");ctx.fillRect(0, 0, ' + (100-parseInt(percentdisk)) + ', 30);</script><br >\n');
    res.write('<b>Share: </b>');
    if(!ip){
      res.write('<i>Press Refresh button</i>');
    }else if (ip){
      res.write('smb://');
      res.write(ip);
      res.write('/' + share + '\n');
    }
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

		res.write('<div id="Account" class="tabcontent">\n');
    res.write('Change login parameters.\n')
		res.write('<form action="newusername" method="get"><br />\n');
		res.write('<input type="text" name="username" value="' + username + '" />Username<br />\n');
		res.write('<input type="password" name="password" />Password<br />\n');
		res.write('<input class="bottone" type="submit" value="Save" />\n');
		res.write('</form>\n');
		res.write('</div>\n');

		res.write('<div id="Share" class="tabcontent">\n');
    res.write('Change <i>WorkGroup</i> and <i>Share</i> information.\n')
		res.write('<form action="saveshare" method="get">\n');
		res.write('<input type="text" name="workgroup" value="' + workgroup + '" /> WorkGroup<br />\n');
		res.write('<input type="text" name="share" value="' + share + '" /> Share<br />\n');
		res.write('<input type="hidden" name="oldusername" value="' + user + '" />\n');
		res.write('<input class="bottone" type="submit" value="Save" />\n');
		res.write('</form>\n</div>\n');

		res.write('<div id="System" class="tabcontent">\n');
    res.write('Change <i>webgui</i> password.\n')
    res.write('<form action="changepwd" method="get" >\n');
    res.write('<input type="password" name="oldpassword" />Old Password<br />\n');
    res.write('<input type="password" name="newpassword" />New Password<br />\n');
    res.write('<input class="bottone" type="submit" value="Save" />\n');
    res.write('</form>\n');
    res.write('<hr />\n');

    /*res.write('<form action="changeip" method="post" \n>')
    res.write('<input type="text" name="ip" value="' + ip + '"/>IP<br />\n');
    res.write('<input type="text" name="netmask" value="' + netmask + '"/>Netmask<br />\n');
    res.write('<input type="text" name="gateway" value="' + gateway + '"/>Gateway<br />\n');
		res.write('<button class="bottone">Save</button><br />\n');
		res.write('</form><hr />\n');*/

    res.write('<form action="logout" method="post">\n');
		res.write('<button class="bottone">Logout</button>\n');
		res.write('</form>\n');

		res.write('<form action="poweroff" method="post">\n');
		res.write('<button class="bottone">PowerOff</button>\n');
		res.write('</form>\n');

		res.write('<form action="reboot" method="post">\n');
		res.write('<button class="bottone">Reboot</button>\n');
		res.write('</form>\n');
		res.write('</div>\n');
	}else if(!sess.login == true){

		res.write('<div class="red">\n<h1>password errata</h1><br />\n');
		res.write('<a href="/">Torna al Login</a>\n</div>\n');
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
