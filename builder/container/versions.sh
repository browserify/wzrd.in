#!/bin/bash

NVM_BIN=$HOME/nvm/nvm.sh

source $NVM_BIN &> /dev/null
nvm use 4 &> /dev/null

node_version=$(node -v | sed s/^v//)
npm_version=$(npm -v)
browserify_version=$(browserify --version)
uglify_version=$(uglifyjs --version | sed "s/^uglify-js //")

jq -n -c -M \
  --arg node_version "${node_version}" \
  --arg npm_version "${npm_version}" \
  --arg browserify_version "${browserify_version}" \
  --arg uglify_version "${uglify_version}" \
    '{
      "node": $node_version,
      "npm": $npm_version,
      "browserify": $browserify_version,
      "uglify-js": $uglify_version
    }'

