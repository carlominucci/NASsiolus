const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('../privatekey.pem'),
  cert: fs.readFileSync('../certificate.pem')
};

https.createServer(options, (req, res) => {
  	res.writeHead(200, {'Content-Type': 'text/html'});
  	res.end('<h1>SimpleNASs1</h1>\n');
	res.end('<input type="text" name="username" /> username<br />\n');
	res.end('<input type="password" name="password" /> password<br />\n');
}).listen(8000);
