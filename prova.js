var express = require('express');
var fs = require('fs');
var https = require('https');
var app = express();
var bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
	res.write('<h1>NASsiolus</h1>\n');
        res.write('<form action="login" method="post">');
        res.write('<input type="password" name="password" /> password<br />\n');
        res.write('<button>Login</button>\n');
        res.write('</form>\n');
	res.end();
})

app.post('/login', function (req, res){
	var password=req.body.password;
	res.write(password);
	res.end();
})

https.createServer({
  key: fs.readFileSync('/srv/NASsiolus/privatekey.pem'),
  cert: fs.readFileSync('/srv/NASsiolus/certificate.pem')
}, app)
.listen(3000, function () {
  console.log('Start webgui')
})
