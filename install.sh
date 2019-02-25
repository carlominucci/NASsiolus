#!/bin/sh
echo "Creo i certificati..."
mkdir /srv/NASsiolus
openssl genrsa -out /srv/NASsiolus/privatekey.pem 1024
openssl req -new -key /srv/NASsiolus/privatekey.pem -out /srv/NASsiolus/certrequest.csr
openssl x509 -req -in /srv/NASsiolus/certrequest.csr -signkey /srv/NASsiolus/privatekey.pem -out /srv/NASsiolus/certificate.pem

echo
echo "Installo il servizio webgui.js..."
cp -v webgui.js /srv/NASsiolus/
cp -v header.html /srv/NASsiolus/
cp -v footer.html /srv/NASsiolus/
cp -v passwd /srv/NASsiolus/
cp -v /etc/samba/smb.conf /etc/samba/smb.conf.orig
mkdir /srv/NASsiolus_share/

echo
echo "Installo i pacchetti necessari..."
apk add samba 
apk add nodejs
apk add npm

echo
echo "Installo le dipendenze per nodejs..."
npm install os
npm install fs
npm install express
npm install body-parser
npm install crypto
npm install check-disk-space
npm install split
npm install child_process
npm install express-session

#adduser -s /sbin/nologin -h /dev/null admin 
#smbpasswd -a admin

echo
ip address show | grep inet | grep -v inet6 | grep -v 127 | awk {'print "http:", $2'} | sed -e 's/ /\/\//' | sed -e 's/\/24/:11235/'
echo "Default password is: password";
echo
