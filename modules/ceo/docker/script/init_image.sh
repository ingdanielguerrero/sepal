#!/usr/bin/env bash
set -e

apt-get -y update && DEBIAN_FRONTEND=noninteractive apt-get install -y\
 python-pip\
 libssl-dev\
 libffi-dev\
 gettext\
 git\
 mongodb\
 nodejs\
 npm\
 supervisor

git clone https://github.com/openforis/gee-gateway.git /src/gee-gateway
mkdir -p /src/ceo
mv /src/gee-gateway/gee_gateway /src/ceo/gee_gateway

npm install --global bower
