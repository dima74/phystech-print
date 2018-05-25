#!/bin/sh -e
set -x

export VERSION=`date +'%m.%d.%Y_%H:%M:%S'`
sudo heroku container:push web