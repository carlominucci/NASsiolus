var express = require('express');
var session = require('express-session');
const expressSanitizer = require('express-sanitizer');
var useragent = require('express-useragent');
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
var arraySort = require('array-sort');

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
var smblog = new String();;

app.use(expressSanitizer());

app.use(session({
    secret: '2C44-4D44-WppQ38S',
    resave: true,
    saveUninitialized: true
}));

const headerhtml = fs.readFileSync("./header.html");
const headermobile = fs.readFileSync("./mobile.html");
const footerhtml = fs.readFileSync("./footer.html");
var writesaved = headerhtml + '<div class="action">\n' + 'Saved.\n' + '<form action="/admin" method="post">\n' + '<button class="bottone" >Back</button>\n' + '</form>\n' + '</div>\n' + footerhtml;

checkDiskSpace('/').then((diskSpace) => {
  freespace=diskSpace.free;
  totalspace=diskSpace.size;
});

function poweroff(callback){
	exec('poweroff', function(error, stdout, stderr){ callback(stdout); });
}
function reboot(callback){
	exec('reboot', function(error, stdout, stderr){ callback(stdout); });
}

function lastlogin(callback){
  fs.readdir("/var/log/samba/", function(err, items) {
    for (var i=0; i<items.length; i++) {
      //console.log(items[i]);
      if(items[i] == "cores"){
      }else if(items[i] == "log.nmbd"){
      }else if(items[i] == "log.smbd"){
      }else if(items[i] == "log.smbd.old"){
      }else if(items[i] == "log."){
      }else{
        var line = items[i].split("log.");
        smblog += line[1].toString() + "<br />\n";
      }
    }
    return;
  });
}

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
app.use(useragent.express());

app.get('/', function (req, res) {
  console.log(req.useragent.isMobile);
	sambaitem();
	//networkdata();
	res.set('Content-Type', 'text/html');
  if(req.useragent.isMobile == false){
    res.write(headerhtml);
  }else if(req.useragent.isMobile == true){
    res.write(headermobile);
  }
	res.write('<div class="box">\n');
	res.write('<h1>NASsiolus - ' + os.hostname + ' </h1><br />\n');
  res.write('smb://' + ip + '/' + share + '<br /><br />');
  res.write('Password:<br /><form action="admin" method="post">');
  res.write('<input type="password" name="password" /><br />\n');
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
      var command = 'adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + response.username + '; ';
      command += '(echo "' + response.password + '"; echo "' + response.password + '") | smbpasswd -a ' + response.username+ '; ';
      command += 'chown -R ' + response.username + ' /srv/NASsiolus_share';
      console.log(command);
      exec(command);
        //exec('sleep 2; adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + response.username);
	      //exec('(echo "' + response.password + '"; echo "' + response.password + '") | smbpasswd -a ' + response.username);
        //exec('chwon -R ' + response.username + ' /srv/NASsiolus_share');
	}else if(etcpasswd.indexOf('NASsiolus user') < 0){
      var command = 'adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + response.username + '; ';
      command += '(echo "' + response.password + '"; echo "' + response.password + '") | passwd ' + response.username + '; ';
      command += '(echo "' + response.password + '"; echo "' + response.password + '") | smbpasswd -a ' + response.username + '; ';
      command += 'chown -R ' + response.username + ' /srv/NASsiolus_share';
      console.log(command);
      exec(command);
		    //exec('adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + response.username);
   	    //exec('(echo "' + response.password + '"; echo "' + response.password + '") | passwd ' + response.username)
        //exec('(echo "' + response.password + '"; echo "' + response.password + '") | smbpasswd -a ' + response.username);
        //exec('chwon -R ' + response.username + ' /srv/NASsiolus_share');
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
	exec("apk update && apk upgrade; npm update",
    	function (error, stdout, stderr) {
      		res.set('Content-Type', 'text/html');
   	 	    res.write(headerhtml);
  		    res.write('<div class="boxupdate">\n');
      		res.write('<h1>Update</h1>\n')
      		res.write('<pre>\n');
      		res.write(stdout);
      		res.write('</pre>\n');
      		res.write('<form action="/admin" method="post">\n');
      		res.write('<button class="bottone" >Back</button>\n');
      		res.write('</form></div>\n');
      		res.end(footerhtml);
  	});
});

app.post('/poweroff', function(req, res){
	res.set('Content-Type', 'text/html');
  	res.write(headerhtml)
  	res.write('<div class="box">\n');
  	res.write('Poweroff in progress..');
  	res.write('</div>');
  	res.end(footerhtml);
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
  	});
});

	app.post('/admin', function (req, res, next){
  sess = req.session;
	res.set('Content-Type', 'text/html');
  console.log(req.useragent.isMobile);
  if(req.useragent.isMobile == false){
    res.write(headerhtml);
  }else if(req.useragent.isMobile == true){
    res.write(headermobile);
  }

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
    		var days = Math.floor(os.uptime() / (60*60*24));
    		var hours = Math.floor((os.uptime() / (60*60)) - (24 * days));
    		var minutes = Math.floor(os.uptime() % (60*60) / 60);
    		var seconds = Math.floor(os.uptime() % 60);
		    res.write('<b>Uptime: </b>' + days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's<br />\n');
    		res.write('<b>Load: </b>' + os.loadavg()[0].toFixed(2) + '/' + os.loadavg()[1].toFixed(2) + '/' + os.loadavg()[2].toFixed(2) + '\n');

    		var loadpixel;
    		function printLoad(loadavg){
      		if(loadavg < 1){
        		loadpixel = 30-(loadavg * 10);
      		}
      		if(loadavg <10 && loadavg > 1){
        		loadpixel = 20-loadavg;
      		}
      		if(loadavg > 10){
        		loadpixel = 30-((loadavg * 50) / 30);
      		}
      		//console.log(m);
    	}

	res.write('<br /><canvas id="canvasLoad" width="100" height="30" style="border: 1px solid #2196F3; background-color: #fff"></canvas>\n<script>var c = document.getElementById("canvasLoad");\nvar ctx = c.getContext("2d");\nctx.beginPath();\nctx.lineTo(0,');
    	printLoad(os.loadavg()[0]);
    	res.write(loadpixel + ');\nctx.lineTo(50, ');
    	printLoad(os.loadavg()[1]);
    	res.write(loadpixel + ');\nctx.lineTo(100, ');
    	printLoad(os.loadavg()[2]);
    	res.write(loadpixel + ');\nctx.strokeStyle="#000";\nctx.stroke();\n</script><br />\n');

    	var percentmem = os.freemem * 100 / os.totalmem;
    	res.write('<b>Memory: </b><br />');
    	res.write('<canvas id="myCanvasmem" width="100" height="30" style="border:1px solid #2196F3; background-color: #fff;"></canvas>\n<script>var c = document.getElementById("myCanvasmem");\nvar ctx = c.getContext("2d");\nctx.fillRect(0, 0, ' + (100-parseInt(percentmem)) + ', 30);\n')
    	res.write('ctx.fillStyle = "red";ctx.fillText("' + (100-parseInt(percentmem)) + '%", 5, 25);ctx.fillStyle = "green";ctx.fillText("' + parseInt(percentmem) + '%", ' + (100-parseInt(percentmem)+5) + ', 25);');
    	res.write('</script><br />\n');
    	res.write(parseInt((os.totalmem/1024)/1024) + ' Mb total<br /> ' + parseInt((os.totalmem-os.freemem)/1024/1024) + ' Mb used<br />' + parseInt((os.freemem/1024)/1024) + ' Mb free<br />\n');

    	checkDiskSpace('/').then((diskSpace) => {
    		freespace=diskSpace.free;
    		totalspace=diskSpace.size;
    	});
    	var percentdisk = freespace * 100 / totalspace;
    	res.write('<b>Disk Usage: </b><br />');
    	res.write('<canvas id="myCanvasdisk" width="100" height="30" style="border:1px solid #2196F3; background-color: #fff;"></canvas>\n<script>var c = document.getElementById("myCanvasdisk");\nvar ctx = c.getContext("2d");\nctx.fillRect(0, 0, ' + (100-parseInt(percentdisk)) + ', 30);\n');
    	res.write('ctx.fillStyle = "red";ctx.fillText("' + (100-parseInt(percentdisk)) + '%", 5, 25);ctx.fillStyle = "green";ctx.fillText("' + parseInt(percentdisk) + '%", ' + (100-parseInt(percentdisk)+5) + ', 25);');
    	res.write('</script><br />\n');
    	res.write( (((totalspace/1024)/1024)/1024).toFixed(2) + ' Gb total<br />' + ((totalspace-freespace)/1024/1024/1024).toFixed(2) + ' Gb used<br /> ' + (((freespace/1024)/1024)/1024).toFixed(2) + ' Gb free<br />\n');

    	res.write('<b>Share: </b>');
    	if(!ip){
      		res.write('<i>Press Refresh button</i>');
    	}else if (ip){
      		res.write('smb://');
      		res.write(ip);
      		res.write('/' + share + '<br />\n');
    	}
    	res.write('<b>Last connection:</b><br />\n');

    lastlogin();
    res.write(smblog.toString());
    smblog="";

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
  res.write('<h1>Login parameters</h1><br />\n');
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
	res.write('Share:<br /><input type="text" name="share" value="' + share + '" /><br />\n');
	res.write('<input type="hidden" name="oldusername" value="' + user + '" />\n');
	res.write('<input class="bottone" type="submit" value="Save" />\n');
	res.write('</form>\n</div>\n');

	res.write('<div class="box">\n');
  res.write('<h1>System</h1><br />\n');
  res.write('Change <i>webgui</i> password.<br />\n');
  res.write('<form action="changepwd" method="get" >\n');
  res.write('Old Password:<br /><input type="password" name="oldpassword" />\n');
  res.write('New Password:<br /><input type="password" name="newpassword" />\n');
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
    		res.write('<form action="/logout" method="post">\n');
    		res.write('<button class="bottone" >Back</button>\n');
    		res.write('</form>\n');
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
