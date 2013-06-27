#!/bin/bash

echo 'Setting environment variables on drone...'

USERNAME=`json -f ~/.jitsuconf username`
PASSWORD=`json -f ~/.jitsuconf password`
SUBDOMAIN=`json -f ./package.json subdomain`

jitsu env set LVLDUMP_USERNAME $USERNAME > /dev/null
jitsu env set LVLDUMP_PASSWORD $PASSWORD > /dev/null

echo 'Getting lvldump.tgz from nodejitsu...'

curl https://$USERNAME:$PASSWORD@$SUBDOMAIN.nodejitsu.com/_leveldump > lvldump.tgz

echo
echo 'Done.'
echo
