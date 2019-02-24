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
var freespace = new String();
var totalspace = new String();
var workgroupd = new String();
var share = new String();
var user = new String();

checkDiskSpace('/').then((diskSpace) => {
	freespace=diskSpace.free;
	totalspace=diskSpace.size;
});

const headerhtml = fs.readFileSync("./header.html");
const footerhtml = fs.readFileSync("./footer.html");
var sambaconf = fs.readFileSync("/etc/samba/smb.conf");
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
	res.write('<div class="info">\n');
	res.write('<h1>NASsiolus - ' + os.hostname + ' </h1>\n');
        res.write('<form action="login" method="post">');
        res.write('<input type="password" name="password" />\n');
        res.write('<button>Login</button>\n');
        res.write('</form>\n</div>\n');
	res.write('<div class="share">\n');
	res.write('smb://' + addresses + '/' + share);
	res.end(footerhtml);
});

app.post('/saveshare', function(req, res){
	res.set('Content-Type', 'text/html');
	res.write('ciao');
	res.end();
});

app.post('/login', function (req, res){
	res.set('Content-Type', 'text/html');
	res.write(headerhtml);
	var password=req.body.password;
	var sha512 = crypto.createHash('sha512').update(password).digest("hex");
	var contents = fs.readFileSync('./passwd', 'utf8');

	if(sha512 == contents){
		res.write('<div class="info">');
		res.write('<b> ' + os.hostname + ': </b>' + addresses + '<br />\n');
		res.write('<b>Os: </b>' + os.type +  ' ' + os.release() + ' ' + os.arch() + '<br />\n');
		res.write('<b>Uptime: </b>' + os.uptime() + ' s<br />\n');
		res.write('<b>Memory: </b>' + os.totalmem/1024 + 'Mb total / ' + os.freemem/1024 + 'Mb free<br />\n');
		res.write('<b>Disk Usage: </b>' + totalspace/1024 + 'Mb total / ' + freespace/1024 + 'Mb free<br />\n');
		res.write('</div>\n');
		res.write('<div class="share">\n');
		res.write('<form action="saveshare" method="post">\n');
		res.write('<input type="text" name="workgroup" value="' + workgroup + '" /> WorkGroup<br />\n');
		res.write('<input type="text" name="share" value="' + share + '" /> Share<br />\n');
		res.write('<input type="text" name="username" value="' + user + '" /> Username<br />\n');
		res.write('<input type="password" name="pwd" /> Password<br />\n');
		res.write('<button>Save</button>\n');
		res.write('</form>\n</div>\n');
	}else{
		res.write('<div class="share">\n<h1>password errata</h1><br />\n');
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

