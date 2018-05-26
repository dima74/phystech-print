#!/bin/sh -e
set -x

sed -i '/ru_RU.UTF-8/s/^#//w /dev/stdout' /etc/locale.gen | read
locale-gen
echo LANG=ru_RU.UTF-8 >/etc/locale.conf
export LANG=ru_RU.UTF-8

pacman -Sy --noconfirm glibc  # bug with libnsl
pacman -Sy --noconfirm python python-pip gunicorn nginx-mainline
pip install --no-cache-dir -r `dirname $0`/../requirements.txt

ln -s /app/nginx /etc/nginx/phystech-print
cp /app/nginx/nginx.conf /etc/nginx/nginx.conf
