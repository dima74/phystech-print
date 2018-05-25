#!/bin/sh -e
set -x
# systemctl start nginx.service || journalctl -u nginx.service
# cat /etc/nginx/nginx.conf
sed -i "s/PORT/$PORT/" /app/nginx/server.conf
nginx
gunicorn --bind 127.0.0.1:5000 app:app