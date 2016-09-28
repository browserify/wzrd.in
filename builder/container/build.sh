#!/bin/bash

INPUT="$(cat -)"

# some constants
CORE_MODULES="assert buffer child_process cluster console constants crypto dgram dns domain events freelist fs http https module net os path punycode querystring readline repl smalloc stream string_decoder sys timers tls tty url util vm zlib"
REGISTRY_URL='http://registry.npmjs.org'
NVM_BIN="$HOME/nvm/nvm.sh"

RUN_ROOT=$(pwd)
LOG_FILE="${RUN_ROOT}/log.log"
BROWSERIFY_FILE="${RUN_ROOT}/build/bundle.js"

function info() {
  echo 'info: ' ${@} >> ${LOG_FILE}
}

source $NVM_BIN >> $LOG_FILE 2>&1
nvm use 4 >> $LOG_FILE 2>&1

info "Extracting variables from payload..."

# Things I expect to be passed to me
module_scope=$(echo $INPUT | jq -r '.module_scope')
if [ $module_scope == 'null' ]; then
  module_scope=''
  info "  - module_scope: (no scope)"
else
  info "  - module_scope: ${module_scope}"
fi

module_name=$(echo $INPUT | jq -r '.module_name')
info "  - module_name: ${module_name}"

module_version=$(echo $INPUT | jq -r '.module_version')
info "  - module_version: ${module_version}"

module_subfile=$(echo $INPUT | jq -r '.module_subfile')
if [ $module_subfile == 'null' ]; then
  module_subfile=''
fi
info "  - module_subfile: ${module_subfile}"

standalone=$(echo $INPUT | jq -r '.standalone')
if [ $standalone == 'null' ]; then
  standalone='false'
fi
info "  - standalone: ${standalone}"

debug=$(echo $INPUT | jq -r '.debug')
if [ $debug == 'null' ]; then
  debug='false'
fi
info "  - debug: ${debug}"

full_paths=$(echo $INPUT | jq -r '.full_paths')
if [ $full_paths == 'null' ]; then
  full_paths='false'
fi
info "  - full_paths: ${full_paths}"

# Things I can derive
module_path=${module_scope}
if [ $module_path ]; then
  module_path=${module_path}/${module_name}
else
  module_path=${module_name}
fi
info "  - module_path: ${module_path}"

require_path=${module_path}
if [ $module_subfile ]; then
  require_path=${module_path}/${module_subfile}
fi
info "  - require_path: ${require_path}"

is_in_core='false'
if [ "$(echo "$CORE_MODULES" | grep "$module_path")" ]; then
  info "Module is in core..."
  is_in_core='true'
else
  info "Module is NOT in core..."
fi

info "Initializing build directory..."
rm -rf ./build
mkdir ./build

touch ${LOG_FILE}
touch ${BROWSERIFY_FILE}

function die() {
  cd ${RUN_ROOT}

  local error_code=$1

  info "Exiting with code ${error_code}"'!'

  local bundle=$(cat $BROWSERIFY_FILE)
  local logs=$(cat $LOG_FILE)

  if [ -e ./build/node_modules/${module_path}/package.json ]; then
    local pkg=$(cat ./build/node_modules/${module_path}/package.json) > /dev/null 2>&1
  else
    local pkg="{}"
  fi

  if [ ! "${pkg}" ]; then
    pkg="{}"
  fi

  local debug=$(
    jq -n -c -M \
      --arg module_scope "${module_scope}" \
      --arg module_name "${module_name}" \
      --arg module_version "${module_version}" \
      --arg module_subfile "${module_subfile}" \
      --arg module_path "${module_path}" \
      --arg require_path "${require_path}" \
      --arg is_in_core "${is_in_core}" \
      --argjson standalone "${standalone}" \
      --argjson debug "${debug}" \
      --argjson full_paths "${full_paths}" \
      --argjson versions "$(bash ./versions.sh)" \
      '{
        "module_scope": $module_scope,
        "module_name": $module_name,
        "module_version": $module_version,
        "module_subfile": $module_subfile,
        "module_path": $module_path,
        "require_path": $require_path,
        "is_in_core": $is_in_core,
        "standalone": $standalone,
        "debug": $debug,
        "full_paths": $full_paths,
        "versions": $versions
      }'
  )

  jq -n -c -M \
    --argjson error_code "${error_code}" \
    --argjson debug "${debug}" \
    --arg logs "${logs}" \
    --argjson pkg "${pkg}" \
    --arg bundle "${bundle}" \
    '{
      "code": $error_code,
      "debug": $debug,
      "logs": $logs,
      "package": $pkg,
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
  local url="${REGISTRY_URL}/${module_path}/-/${module_name}-${module_version}.tgz"
  info "Downloading tarball from ${url}..."
  curl -s --verbose "${url}" 2>> ${LOG_FILE}
}

function adjust_package_json() {
  # Add README to package.json.
  # Could also remove package.scripts but with docker I don't think that's
  # needed.
  info "Analyzing package..."
  node -e '
    '"'"'use strict'"'"';

    const fs = require("fs");
    const path = require("path");

    const glob = require("glob");

    console.log("  - Attempting to read ./package/package.json...");
    const pkg = JSON.parse(fs.readFileSync("./package/package.json"));

    console.log("  - Searching for README...");
    let files = glob.sync("README?(.*)", { cwd: "package/", nocase: true, mark: true });

    files = files.filter((f) => !f.match(/\/$/));

    if (files.length) {
      console.log("  - Found README!");
      console.log("  - Reticulating splines...");
      pkg.readme = fs.readFileSync(path.join("package/", files[0]), "utf8");

      fs.writeFileSync("./package/package.json", JSON.stringify(pkg, null, 2));
    }
  ' >> $LOG_FILE 2>&1
}

function move_to_node_modules() {
  if [ $module_scope ]; then
    local basedir="./node_modules/${module_scope}"
  else
    local basedir="./node_modules"
  fi

  info "Creating directory ${basedir}..."
  mkdir -p "${basedir}"

  local dest="./node_modules/${module_path}"

  info "Moving ./package to ${dest}..."
  mv ./package ${dest}
}

function npm_install() {
  local install_path="./node_modules/${module_path}"
  info "Installing npm dependencies at ${install_path}..."
  cd "${install_path}"
    npm install --production --registry ${REGISTRY_URL} >> ${LOG_FILE} 2>&1
  cd ../..
}

function resolve_standalone_file() {
  if [[ ${standalone} == "true" ]]; then
    info "Attempting to resolve ${require_path}..."
    standalone_file=$(node -pe "require.resolve('${require_path}');") 2>> ${LOG_FILE}
    info "  - Resolved to: ${standalone_file}"
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
    browserify_argv=( "${browserify_argv[@]}" "--standalone" $(basename "${require_path}"))
    if [ ${standalone_file} ]; then
      browserify_argv=( "${browserify_argv[@]}" ${standalone_file} )
    fi
  fi

  if [ ${standalone} == 'false' ]  || [ $is_in_core == 'true' ]; then
    browserify_argv=( "${browserify_argv[@]}" "-r" ${require_path} )
  fi

  info "Running browserify with arguments: ${browserify_argv[@]}..."

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
