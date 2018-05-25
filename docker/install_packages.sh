#!/bin/sh -e
set -x

pacman -Sy --noconfirm glibc  # bug with libnsl
pacman -Sy --noconfirm python python-pip gunicorn nginx-mainline
pip install --no-cache-dir -r `dirname $0`/../requirements.txt