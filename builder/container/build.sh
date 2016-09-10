#!/bin/bash

INPUT="$(cat -)"

# some constants
CORE_MODULES="assert buffer child_process cluster console constants crypto dgram dns domain events freelist fs http https module net os path punycode querystring readline repl smalloc stream string_decoder sys timers tls tty url util vm zlib"
REGISTRY_URL='http://registry.npmjs.org'
NVM_BIN=$HOME/nvm/nvm.sh

LOG_FILE=$HOME/log.log
BROWSERIFY_FILE=$HOME/build/bundle.js

function info() {
  echo 'info: ' ${@} > ${LOG_FILE}
}

source $NVM_BIN &> $LOG_FILE
nvm use 4 &> $LOG_FILE

# Things I expect to be passed to me
module_scope=$(echo $INPUT | jq -r '.module_scope')
if [ $module_scope == 'null' ]; then
  module_scope=''
fi
module_name=$(echo $INPUT | jq -r '.module_name')
module_version=$(echo $INPUT | jq -r '.module_version')
module_subfile=$(echo $INPUT | jq -r '.module_subfile')
if [ $module_subfile == 'null' ]; then
  module_subfile=''
fi
standalone=$(echo $INPUT | jq -r '.standalone')
if [ $standalone == 'null' ]; then
  standalone='false'
fi
debug=$(echo $INPUT | jq -r '.debug')
if [ $debug == 'null' ]; then
  debug='false'
fi
full_paths=$(echo $INPUT | jq -r '.full_paths')
if [ $full_paths == 'null' ]; then
  full_paths='false'
fi

# Things I can derive
module_path=${module_scope}
if [ $module_path ]; then
  module_path=${module_path}/${module_name}
else
  module_path=${module_name}
fi

require_path=${module_path}
if [ $module_subfile ]; then
  require_path=${module_path}/${module_subfile}
fi

is_in_core='false'
if [ $(echo $CORE_MODULES | grep "$module_name") ]; then
  is_in_core='true'
fi

rm -rf ./build
mkdir ./build

touch ${LOG_FILE}
touch ${BROWSERIFY_FILE}

function die() {
  local error_code=$1

  local bundle=$(cat $BROWSERIFY_FILE)
  local logs=$(cat $LOG_FILE)
  local pkg=$(cat ./build/node_modules/${module_path}/package.json) &> /dev/null

  if [ ! "${pkg}" ]; then
    pkg="{}"
  fi

  local debug=$(
    jq -n -c -M \
      --arg error_code "${error_code}" \
      --arg module_scope "${module_scope}" \
      --arg module_name "${module_name}" \
      --arg module_version "${module_version}" \
      --arg module_subfile "${module_subfile}" \
      --arg standalone "${standalone}" \
      --arg debug "${debug}" \
      --arg full_paths "${full_paths}" \
      '{
        "error_code": $error_code,
        "module_scope": $module_scope,
        "module_name": $module_name,
        "module_version": $module_version,
        "module_subfile": $module_subfile,
        "standalone": $standalone,
        "debug": $debug,
        "full_paths": $full_paths
      }'
  )

  jq -n -c -M \
    --argjson debug "${debug}" \
    --arg logs "${logs}" \
    --argjson pkg "${pkg}" \
    --arg bundle "${bundle}" \
    '{
      "debug": $debug,
      "logs": $logs,
      "pkg": $pkg,
      "bundle": $bundle
    }'

  exit $error_code
}

function die_if_error() {
  local return_code=$?

  if [ $return_code != 0 ]; then
    die $return_code
  fi
}


function download() {
  curl -s "${REGISTRY_URL}/${module_path}/-/${module_name}-${module_version}.tgz" 2>> ${LOG_FILE}
}

function adjust_package_json() {
  # Add README to package.json.
  # Could also remove package.scripts but with docker I don't think that's
  # needed.
  node -e '
    '"'"'use strict'"'"';

    const fs = require("fs");
    const path = require("path");

    const glob = require("glob");

    const pkg = JSON.parse(fs.readFileSync("./package/package.json"));

    let files = glob.sync("README?(.*)", { cwd: "package/", nocase: true, mark: true });

    files = files.filter((f) => !f.match(/\/$/));

    if (files.length) {

      pkg.readme = fs.readFileSync(path.join("package/", files[0]), "utf8");

      fs.writeFileSync("./package/package.json", JSON.stringify(pkg, null, 2));
    }
  ' &>> $LOG_FILE
}

function move_to_node_modules() {
  mkdir ./node_modules
  mv ./package ./node_modules/${module_path}
}

function npm_install() {
  cd ./node_modules/${module_path}
    npm install --production --registry ${REGISTRY_URL} &>> $LOG_FILE
  cd ../..
}

function resolve_standalone_file() {
  if [[ ${standalone} == "true" ]]; then
    standalone_file=$(node -pe "require.resolve('$module_path');")
  fi
}

function run_browserify() {
  local browserify_argv=()

  if [ ${debug} == 'true' ]; then
    browserify_argv=( "${browserify_argv[@]}" "--debug" )
  fi

  if [ ${full_paths} == 'true' ]; then
    browserify_argv=( "${browserify_argv[@]}" "--full-paths" )
  fi

  if [ ${standalone} == 'true' ]; then
    browserify_argv=( "${browserify_argv[@]}" "--standalone" ${require_path})
    if [ ${standalone_file} ]; then
      browserify_argv=( "${browserify_argv[@]}" ${standalone_file} )
    fi
  fi

  if [ ${standalone} == 'false' ]  || [ $is_in_core == 'true' ]; then
    browserify_argv=( "${browserify_argv[@]}" "-r" ${require_path} )
  fi

  browserify ${browserify_argv[@]} 2>>${LOG_FILE} | uglifyjs - 2>>${LOG_FILE} 1>${BROWSERIFY_FILE}
}

cd ./build

  if [ ${is_in_core} != 'true' ]; then
    download | tar -xz
    die_if_error

    adjust_package_json
    die_if_error

    move_to_node_modules
    die_if_error

    npm_install
    die_if_error

    resolve_standalone_file
    die_if_error
  fi

  run_browserify
  die_if_error

cd ..

die 0
