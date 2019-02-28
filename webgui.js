var express = require('express');
var fs = require('fs');
var https = require('https');
var app = express();
var bodyParser = require("body-parser");
var port = "11235";
var os = require('os');
var path = require('path');
var interfaces = os.networkInterfaces();
var addresses = [];
var crypto = require('crypto');
var checkDiskSpace = require('check-disk-space');
var split = require('split');
var exec = require('child_process').exec;
var freespace = new String();
var totalspace = new String();
var workgroup = new String();
var share = new String();
var user = new String();
var sambaconfnew;
const headerhtml = fs.readFileSync("./header.html");
const footerhtml = fs.readFileSync("./footer.html");

var etcpasswd = fs.readFileSync('/etc/passwd', 'utf8');
console.dir(etcpasswd);

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

fs.createReadStream("/etc/samba/smb.conf")
	.pipe(split())
	.on('data', function(line){
		var tmp = line.split("=");
		if(tmp[0].trim() == "workgroup"){
			workgroup=(tmp[1].trim());
		}
		if(tmp[0].trim() == "valid users"){
			user=(tmp[1].trim());
		}
		if(tmp[0].match(/\[*\]/) && !tmp[0].match(/\[global\]/)){
			share=(tmp[0].replace(/[\[\]]/g, ''));
		}
	})
	.on('close', function(err){
	});

for(var k in interfaces){
	for(var k2 in interfaces[k]){
		var address = interfaces[k][k2];
		if(address.family === 'IPv4' && !address.internal){
			addresses.push(address.address);
		}
	}
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
	res.set('Content-Type', 'text/html');
	res.write(headerhtml);
	res.write('<div id="Info">\n');
	res.write('<h1>NASsiolus - ' + os.hostname + ' </h1>\n');
        res.write('<form action="login" method="post">');
        res.write('<input type="password" name="password" />\n');
        res.write('<button class="bottone">Login</button>\n');
        res.write('</form>\n</div>\n');
	res.write('<div id="Info">\n');
	res.write('smb://' + addresses + '/' + share);
	res.write('</div>\n');
	res.end(footerhtml);
});

app.get('/saveshare', function(req, res){
	response = {
		workgroup : req.query.workgroup,
		share : req.query.share,
		username : req.query.username,
		id : req.query.id,
		password : req.query.password,
		oldusername: req.query.oldusername
	};

	var etcpasswd = fs.readFileSync('/etc/passwd', 'utf8');
	var line = etcpasswd.split("\n");
	for (i = 0; i < line.length; i++) {
		var tmp = line[i].split(":");
		if(tmp[4]){
			if(tmp[4] == "NASsiolus user"){
				console.log(tmp[4]);
				if(tmp[0] == response.oldusername){
					console.log("1");
					var username = response.username;
				}else if(tmp[0] == response.oldusername){
					var username = response.username;
					exec('(echo "' + passwrd + '"; echo "ciao") | smbpasswd -a ' + tmp[0]);
					console.log("2");
				}else if(tmp[0] != response.username && response.username == "root"){
					var username = response.username;
					exec('deluser' + tmp[0]);
					exec('smbpasswd -x ' + tmp[0]);
					exec('adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + tmp[0]);
					exec('(echo "' + password + '"; echo "ciao") | smbpasswd -a ' + tmp[0]);
					console.log("3");
				}
			}else{

				exec('adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + tmp[0]);
				exec('(echo "' + password + '"; echo "ciao") | smbpasswd -a ' + tmp[0]);
			}
		}
	}

	/*
	exec('deluser' + tmp[0]);
	exec('smbpasswd -x ' + tmp[0]);
	exec('adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + tmp[0]);
	exec('(echo "' + password + '"; echo "ciao") | smbpasswd -a ' + tmp[0]);
	*/
console.log(response.username + username + response.oldusername);
	sambaconfnew = "[global]\n";
	sambaconfnew += "workgroup = " + response.workgroup + "\n";
	sambaconfnew += "server string = " + os.hostname + " " + response.share + " - NASsiolus\n";
	sambaconfnew += "server role = standalone server\n";
	sambaconfnew += "log file = /usr/local/samba/var/log.%m\n";
	sambaconfnew += "max log size = 50\n";
	sambaconfnew += "[" + response.share + "]\n";
	sambaconfnew += "comment = " + response.share + " share\n";
	sambaconfnew += "path = /srv/NASsiolus_share\n";
	sambaconfnew += "valid users = " + username + "\n";
	sambaconfnew += "public = no\n";
	sambaconfnew += "writable = yes\n";
	sambaconfnew += "printable = no\n";
	sambaconfnew += "create mask = 0765\n";
	fs.writeFile('/etc/samba/smb.conf', sambaconfnew, function(err){
		if (err) throw err;
	});
	exec("service samba restart");
	fs.writeFile('/etc/hostname', response.workgroup, function(err){
		if (err) throw err;
	});
	exec("hostname -F /etc/hostname");

	res.set('Content-Type', 'text/html');
	res.write(headerhtml);
	res.write('<div class="Share">\n');
	res.write('Salvataggio effettuato.\n');
	res.write('<form action="/login" method="post">\n');
  res.write('<input type="hidden" name="id" value="' + response.id + '" />\n')
	res.write('<button class="bottone" >Back</button>\n');
	res.write('</form>\n');
	res.write('</div>\n');
	res.end(footerhtml);
});

app.post('/poweroff', function(req, res){
	res.set('Content-Type', 'text/html');
	res.write(headerhtml);
	res.write('<div class="System">\n');
	res.write('Poweroff in progress...\n');
	res.write('</div>\n');
	res.end(footerhtml);
	poweroff(function(output){
		console.log(output);
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
		console.log(output);
	});
});

app.post('/login', function (req, res){
	res.set('Content-Type', 'text/html');
	res.write(headerhtml);
	if(!req.body.password){
		var sha512=req.body.id;
	}else if(req.body.password){
		var password=req.body.password;
		var sha512 = crypto.createHash('sha512').update(password).digest("hex");
	}
	var contents = fs.readFileSync('./passwd', 'utf8');

	if(sha512 == contents){
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

		res.write('<button class="tablink" onclick="openPage(\'Info\', this, \'#0e0\')" id="defaultOpen">Info</button>\n');
		res.write('<button class="tablink" onclick="openPage(\'Share\', this, \'#e00\')">Share</button>\n');
		res.write('<button class="tablink" onclick="openPage(\'System\', this, \'#00e\')">System</button>\n');
		res.write('<div id="Info" class="tabcontent">');
		res.write('<b> ' + os.hostname + ': </b>' + addresses + '<br />\n');
		res.write('<b>Os: </b>' + os.type +  ' ' + os.release() + ' ' + os.arch() + '<br />\n');
		res.write('<b>Uptime: </b>' + os.uptime() + ' s<br />\n');
		res.write('<b>Memory: </b>' + os.totalmem/1024 + 'Mb total / ' + os.freemem/1024 + 'Mb free<br />\n');
		res.write('<b>Disk Usage: </b>' + totalspace/1024 + 'Mb total / ' + freespace/1024 + 'Mb free<br />\n');
		res.write('</div>\n');
		res.write('<div id="Share" class="tabcontent">\n');
		res.write('<form action="saveshare" method="get">\n');
		res.write('<input type="text" name="workgroup" value="' + workgroup + '" /> WorkGroup<br />\n');
		res.write('<input type="text" name="share" value="' + share + '" /> Share<br />\n');
		res.write('<input type="hidden" name="id" value="' + sha512 + '" />\n');
		res.write('<input type="hidden" name="oldusername" value="' + user + '" />\n');
		res.write('<input type="text" name="username" value="' + user +'" /> Username<br />\n');
		res.write('<input type="password" name="pwd" /> Password<br />\n');
		res.write('<input class="bottone" type="submit" value="Save" />\n');
		res.write('</form>\n</div>\n');
		res.write('<div id="System" class="tabcontent">');
		res.write('<form action="poweroff" method="post">\n');
		res.write('<button class="bottone">PowerOff</button>\n');
		res.write('</form>\n');
		res.write('<form action="reboot" method="post">\n');
		res.write('<button class="bottone">Reboot</button>\n');
		res.write('</form>\n');
		res.write('</div>\n');
	}else{
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
  	console.log("https://" + addresses + ":" + port + "\n");
});
