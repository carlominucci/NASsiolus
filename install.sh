#!/bin/bash
echo "Creo i certificati..."
mkdir /srv/NASsiolus
openssl genrsa -out /srv/NASsiolus/privatekey.pem 1024
openssl req -new -key /srv/NASsiolus/privatekey.pem -out /srv/NASsiolus/certrequest.csr
openssl x509 -req -in /srv/NASsiolus/certrequest.csr -signkey /srv/NASsiolus/privatekey.pem -out /srv/NASsiolus/certificate.pem

echo "Installo il servizio webgui.js..."
cp webgui.js /srv/NASsiolus/

echo "Installo i pacchetti necessari..."
apk add samba 
apk add nodejs
apk add npm

echo "Installo le dipendenze per nodejs..."
npm install os
npm install express
npm install body-parser
#adduser -s /sbin/nologin -h /dev/null admin 
