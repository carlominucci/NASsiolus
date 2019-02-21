const https = require('https');
const fs = require('fs');
var port = "8000";
var os = require('os');
var express = require("express");
var app = express();
var path = require('path');
var bodyParser = require("body-parser");

var interfaces = os.networkInterfaces();
var addresses = [];
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
        }
    }
}

console.log("https://" + addresses + ":" + port + "\n");

app.post('/login',function(req,res){
  var user_name=req.body.user;
  var password=req.body.password;
  console.log("User name = "+user_name+", password is "+password);
  res.end("yes");
});

const options = {
  key: fs.readFileSync('/srv/NASsiolus/privatekey.pem'),
  cert: fs.readFileSync('/srv/NASsiolus/certificate.pem')
};

var server = https.createServer(options, (req, res) => {
	res.statusCode = 200;
  	res.setHeader('Content-Type', 'text/html');


  		res.write('<h1>NASsiolus</h1>\n');
		res.write('<form action="login" method="post">');
		res.write('<input type="password" name="password" /> password<br />\n');
		res.write('<button>Login</button>\n');
		res.write('</form>\n');

	app.post('/login', function(req, res){
		res.write("bravo");
		console.log("bravo");
	});

	res.end();
})
server.listen(port);

