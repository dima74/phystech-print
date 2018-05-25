#!/bin/sh -e
set -x

pacman -Sy --noconfirm glibc  # bug with libnsl
pacman -Sy --noconfirm python python-pip gunicorn nginx-mainline
pip install --no-cache-dir -r `dirname $0`/../requirements.txt

ln -s /app/nginx /etc/nginx/phystech-print
cp /app/nginx/nginx.conf /etc/nginx/nginx.conf
# sed -i '/http {/a include phystech-print\/server.conf;' /etc/nginx/nginx.conf
# sed -i '/http {/i env PORT;' /etc/nginx/nginx.conf