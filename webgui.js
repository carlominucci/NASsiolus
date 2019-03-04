var express = require('express');
var session = require('express-session');
var fs = require('fs');
var https = require('https');
var app = express();
var bodyParser = require("body-parser");
var port = "11235";
var network = require('network-config');
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
var ip;
var netmask;
var gateway;
var session;
const headerhtml = fs.readFileSync("./header.html");
const footerhtml = fs.readFileSync("./footer.html");


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
	networkdata();
	res.set('Content-Type', 'text/html');
	res.write(headerhtml);
	res.write('<div id="Info">\n');
	res.write('<h1>NASsiolus - ' + os.hostname + ' </h1>\n');
        res.write('<form action="login" method="post">');
        res.write('<input type="password" name="password" />\n');
        res.write('<button class="bottone">Login</button>\n');
        res.write('</form>\n</div>\n');
	res.write('<div id="Info">\n');
	//res.write('smb://' + ip + '/' + share);
	res.write('</div>\n');
	res.end(footerhtml);
});

app.get('/saveusername', function(req, res){
	response = {
		username: req.query.username,
		password: req.query.password
	};
	var etcpasswd = fs.readFileSync('/etc/passwd', 'utf8');
  if(etcpasswd.indexOf('NASsiolus user') >= 0){
		/*exec('smbpasswd -x ' + response.username);
		exec('deluser ' + response.username);
		exec('adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + response.username);
		exec('(echo "' + response.password + '"; echo "' + response.password + '") | smbpasswd -a ' + response.username);
		exec('smbpasswd -x ' + response.username);*/
	}else{
		exec('adduser -s /sbin/nologin -h /dev/null -g "NASsiolus user" ' + response.username);
    echo('(echo "' + response.password + '"; echo "' + response.password + '") | passwd ' + response.username)
		exec('(echo "' + response.password + '"; echo "' + response.password + '") | smbpasswd -a ' + response.username);
		//exec('smbpasswd -x ' + response.username);
 	}
});

app.get('/changepwd', function(req, res){
	//res.set('Content-Type', 'text/html');
	//res.write(headerhtml);
	console.log(req.query.oldpassword + req.query.newpassword);
	//res.write("ciao");
	//res.end(footerhtml);
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
	var line = etcpasswd.split("\n");
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
	sambaconfnew += "comment = " + response.share + " share\n";
	sambaconfnew += "path = /srv/NASsiolus_share\n";ogin
	sambaconfnew += "valid users = " + username + "\n";
	sambaconfnew += "public = no\n";
	sambaconfnew += "writable = yes\n";
	sambaconfnew += "printable = no\n";
	sambaconfnew += "create mask = 0777\n";
	fs.writeFile('/etc/samba/smb.conf', sambaconfnew, function(err){
		if (err) throw err;
	});
	exec("service samba restart");		console.log(interfaces[0].name);
	fs.writeFile('/etc/hostname', response.workgroup, function(err){
		if (err) throw err;
	});
	exec("hostname -F /etc/hostname");

	res.set('Content-Type', 'text/html');
	res.write(headerhtml);
	res.write('<div class="action">\n');
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
	res.write(req.session.id);
	res.write('</div>\n');
	res.end(footerhtml);
	reboot(function(output){
		console.log(output);
	});
});

app.post('/login', function (req, res, next){
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
		app.use(session({
  		secret: sha512,
  		resave: false,
  		saveUninitialized: true
		}))
		session = req.session;

		session.id = sha512;
		console.log(session.id);

    sambaitem();
		networkdata();
		//console.log(gateway);

		res.write('<button class="tablink" onclick="openPage(\'Info\', this, \'#ddd\')" id="defaultOpen">Info</button>\n');
    res.write('<button class="tablink" onclick="openPage(\'Account\', this, \'#ddd\')">Account</button>\n');
		res.write('<button class="tablink" onclick="openPage(\'Share\', this, \'#ddd\')">Share</button>\n');
		res.write('<button class="tablink" onclick="openPage(\'System\', this, \'#ddd\')">System</button>\n');

		res.write('<div id="Info" class="tabcontent">');
		res.write('<b> ' + os.hostname + ': </b>' + ip + '<br />\n');
		res.write('<b>Os: </b>' + os.type +  ' ' + os.release() + ' ' + os.arch() + '<br />\n');
		res.write('<b>Uptime: </b>' + os.uptime() + ' s<br />\n');
		res.write('<b>Memory: </b>' + os.totalmem/1024 + 'Mb total / ' + os.freemem/1024 + 'Mb free<br />\n');
    var percent = freespace * 100 / totalspace;
		res.write('<b>Disk Usage: </b>' + totalspace/1024 + 'Mb total / ' + freespace/1024 + 'Mb free - ' + parseInt(percent) + '% free.<br />\n');
    res.write('<b>Share: </b>smb://' + ip + '/' + share + '<br />\n');
		res.write('</div>\n');

    var etcpasswd = fs.readFileSync('/etc/passwd', 'utf8');
  	var line = etcpasswd.split("\n");
  	for (i = 0; i < line.length; i++) {
  		if(line[i].indexOf('NASsiolus user')  >= 0 ){
  			var tmp = line[i].split(":");
  			var username = tmp[0];
  		}
  	}

		res.write('<div id="Account" class="tabcontent">\n');
		res.write('<form action="saveusername" method="get"><br />\n');
		res.write('<input type="text" name="username" value="' + username + '" />Username<br />\n');
		res.write('<input type="password" name="password" />Password<br />\n');
		res.write('<input class="bottone" type="submit" value="Save" />\n');
		res.write('</form>\n');
		res.write('</div>\n');

		res.write('<div id="Share" class="tabcontent">\n');
		res.write('<form action="saveshare" method="get">\n');
		res.write('<input type="text" name="workgroup" value="' + workgroup + '" /> WorkGroup<br />\n');
		res.write('<input type="text" name="share" value="' + share + '" /> Share<br />\n');
		res.write('<input type="hidden" name="id" value="' + sha512 + '" />\n');
		res.write('<input type="hidden" name="oldusername" value="' + user + '" />\n');
		res.write('<input class="bottone" type="submit" value="Save" />\n');
		res.write('</form>\n</div>\n');

		res.write('<div id="System" class="tabcontent">\n');
    res.write('<form action="changepwd" method="get" >\n');
    res.write('<input type="password" name="oldpassword" />Old Password<br />\n');
    res.write('<input type="password" name="newpassword" />New Password<br />\n');
    res.write('<input class="bottone" type="submit" value="Save" />\n');
    res.write('</form>\n');
    res.write('<hr />\n');

    res.write('<input type="text" name="ip" value="' + ip + '"/>IP<br />\n');
    res.write('<input type="text" name="netmask" value="' + netmask + '"/>Netmask<br />\n');
    res.write('<input type="text" name="gateway" value="' + gateway + '"/>Gateway<br />\n');
		res.write('<button class="bottone">Save</button><br />\n');
		res.write('</form><hr />\n');

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

  	console.log("https://" + ip + ":" + port + "\n");
});
