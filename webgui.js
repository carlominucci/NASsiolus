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
	res.write('<h1>NASsiolus</h1>\n');
        res.write('<form action="login" method="post">');
        res.write('<input type="password" name="password" /> password<br />\n');
        res.write('<button>Login</button>\n');
        res.write('</form>\n');
	res.end();
});

app.post('/login', function (req, res){
	res.set('Content-Type', 'text/html');
	var password=req.body.password;
	res.write(password);
	res.end();
});

https.createServer({
  	key: fs.readFileSync('/srv/NASsiolus/privatekey.pem'),
  	cert: fs.readFileSync('/srv/NASsiolus/certificate.pem')

}, app)
.listen(port, function () {
  	console.log("https://" + addresses + ":" + port + "\n");
});
