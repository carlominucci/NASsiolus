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
        res.write('<input type="password" name="password" />\n');
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
		res.write('Hostname: ' + os.hostname + '<br />');
		res.write('Arch: ' + os.arch() + '<br />');
		res.write('Os: ' + os.type + ' '  + os.platform() + " " + os.release() + '<br />');
		res.write('Uptime: ' + os.uptime() + '<br />');
		res.write('Memory: ' + os.totalmem + ' total / ' + os.freemem + ' free<br />');
		res.write('login ok');
		var smbconf = fs.readFileSync("/etc/samba/smb.conf", 'utf8');
		res.write('<pre>' + smbconf + '</pre>');
	}else{
		res.write('<h1>password errata</h1><br />');
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

