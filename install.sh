#!/bin/sh
clear
echo "************************************"
echo "* Creating certificate...          *"
echo "************************************"
echo
mkdir /srv/NASsiolus
openssl genrsa -out /srv/NASsiolus/privatekey.pem 1024
openssl req -new -key /srv/NASsiolus/privatekey.pem -out /srv/NASsiolus/certrequest.csr
openssl x509 -req -in /srv/NASsiolus/certrequest.csr -signkey /srv/NASsiolus/privatekey.pem -out /srv/NASsiolus/certificate.pem

echo
echo "************************************"
echo "* Install require package...       *"
echo "************************************"
echo
apk add samba
apk add nodejs
apk add npm

echo
echo "************************************"
echo "* Installing files of NASSiolus... *"
echo "************************************"
echo
cp -v webgui.js /srv/NASsiolus/
cp -v header.html /srv/NASsiolus/
cp -v footer.html /srv/NASsiolus/
cp -v passwd /srv/NASsiolus/
cp -rv node_modules /srv/NASsiolus/
cp -v /etc/samba/smb.conf /etc/samba/smb.conf.orig
mkdir /srv/NASsiolus_share/
cp -v NASSiolus /etc/init.d/
service NASsiolus start

echo
echo "************************************"
echo "* Install dependeces for nodejs... *"
echo "************************************"
echo
npm install os
npm install fs
npm install express
npm install body-parser
npm install crypto
npm install check-disk-space
npm install split
npm install child_process
npm install express-session
npm install network-config
echo

echo
ip address show | grep inet | grep -v inet6 | grep -v 127 | awk {'print "https:", $2'} | sed -e 's/ /\/\//' | sed -e 's/\/24/:11235/'
echo "Default password is: password";
echo

echo -e "\nWelcome to NASSiolus, powered by Alpine!\n"> /etc/motd
echo -e "See <https://github.com/carlominucci/NASsiolus>\n" >> /etc/motd
echo -e "Open https://<YOUR.IP.ADDRESS>:11235/ in your browser." >> /etc/motd
#ip address show | grep inet | grep -v inet6 | grep -v 127 | awk {'print "https:", $2'} | sed -e 's/ /\/\//' | sed -e 's/\/24/:11235/' >> /etc/motd
echo -e "\n" >> /etc/motd

echo "NASSiolus in ready..."
