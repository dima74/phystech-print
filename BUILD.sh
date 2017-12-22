#!/bin/sh -e
set -x

# cd && git clone git@github.com:dima74/phystech-print.git && ./phystech-print/BUILD.sh
mkdir -p /home/dima/logs

yaourt -S --needed python-sentry python-cachetools
sudo pacman -S --needed gunicorn python-gevent python-flask python-raven python-blinker
sudo ln -s /home/dima/phystech-print/gunicorn-phystech-print.service /etc/systemd/system/
sudo systemctl enable gunicorn-phystech-print.service
sudo systemctl start gunicorn-phystech-print.service

sudo ln -s /home/dima/phystech-print/nginx /etc/nginx/phystech-print
sudo ln -s /etc/nginx/phystech-print/server-without-ssl.conf /etc/nginx/sites-enabled/phystech-print.conf
sudo nginx -s reload
sudo certbot certonly --nginx --email diraria+ssl@yandex.ru -d xn----8sbnbhf6cvaflp1a1e.xn--p1ai

sudo ln -sf /etc/nginx/phystech-print/server.conf /etc/nginx/sites-enabled/phystech-print.conf
sudo nginx -s reload