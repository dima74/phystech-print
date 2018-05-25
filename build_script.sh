#!/bin/sh -e
set -x

# yaourt -S --noconfirm heroku-cli
# systemctl start docker.service
docker login -u _ -p "$HEROKU_TOKEN"  registry.heroku.com
export VERSION=`date +'%m.%d.%Y_%H:%M:%S'`
sudo heroku container:push web --app phystech-print