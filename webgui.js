const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('../privatekey.pem'),
  cert: fs.readFileSync('../certificate.pem')
};

https.createServer(options, (req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('hello world\n');
}).listen(8000);
