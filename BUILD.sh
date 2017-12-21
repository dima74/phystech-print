#!/bin/sh
set -x

# cd && git clone git@github.com:dima74/phystech-print.git
cd phystech-print

sudo -s <<EOF
ln -s /home/dima/phystech-print/gunicorn-phystech-print.service /etc/systemd/system/
systemctl enable gunicorn-phystech-print.service
systemctl start gunicorn-phystech-print.service

ln -s /home/dima/phystech-print/nginx /etc/nginx/phystech-print
ln -s /etc/nginx/phystech-print/server.conf /etc/nginx/sites-enabled/phystech-print.conf
nginx -s reload
