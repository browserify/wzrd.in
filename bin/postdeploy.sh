#!/bin/bash

USERNAME=`json -f ~/.jitsuconf username`
PASSWORD=`json -f ~/.jitsuconf password`
SUBDOMAIN=`json -f ./package.json subdomain`

echo 'Sending lvldump.tgz to nodejitsu...'

curl -X POST -d @lvldump.tgz https://$USERNAME:$PASSWORD@$SUBDOMAIN.nodejitsu.com/_leveldump
echo
echo 'Done.'
