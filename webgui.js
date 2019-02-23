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
var free;

const headerhtml = fs.readFileSync("./header.html");
const footerhtml = fs.readFileSync("./footer.html");

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
	res.write('<h1>NASsiolus - ' + os.hostname + ' </h1>\n');
        res.write('<form action="login" method="post">');
        res.write('<input type="password" name="password" /> password\n');
        res.write('<button>Login</button>\n');
        res.write('</form>\n');
	res.end(footerhtml);
});

app.post('/login', function (req, res){
	res.set('Content-Type', 'text/html');
	res.write(headerhtml);
	var password=req.body.password;
	var sha512 = crypto.createHash('sha512').update(password).digest("hex");
	var contents = fs.readFileSync('./passwd', 'utf8');

	if(sha512 == contents){
		res.write('<div class="info">');
		res.write('Hostname: ' + os.hostname + '<br />\n');
		res.write('Arch: ' + os.arch() + '<br />\n');
		res.write('Os: ' + os.type + ' '  + os.platform() + " " + os.release() + '<br />\n');
		res.write('Uptime: ' + os.uptime() + '<br />\n');
		res.write('Memory: ' + os.totalmem + ' total / ' + os.freemem + ' free<br />\n');
		res.write('IP Address: ' + addresses + '<br />\n');
		res.write('Disk Usage: ' + ' total / ' + ' free.<br />\n');

		checkDiskSpace('/').then((diskSpace) => {
			free = diskSpace.free;
			//res.send(new Buffer.alloc(free));
			console.log(typeof 'free');
			//res.write(diskSpace);
		});
		res.write('</div>\n');
		//var smbconf = fs.readFileSync("/etc/samba/smb.conf", 'utf8');
		//res.write('<pre>' + smbconf + '</pre>');
		res.write('<div class="share">\n');
		res.write('<form action="saveshare" method="post">\n');
		res.write('<input type="text" name="workgroup" /> WorkGroup<br />\n');
		res.write('<input type="text" name="share" /> Share<br />\n');
		res.write('<input type="text" name="username" /> Username<br />\n');
		res.write('<input type="password" name="pwd" /> Password<br />\n');
		res.write('<button>Save</button>\n');
		res.write('</form>\n</div>\n');
	}else{
		res.write('<h1>password errata</h1><br />\n');
		res.write('<a href="/">Torna al Login</a>\n');
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

