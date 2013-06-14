# BROWSERIFY-CDN
## browserify-as-a-service

## Quick Start

Try visiting this link:

[/bundle/concat-stream@latest](/bundle/concat-stream@latest)

## What just happened?

Well, in *this* case, since someone has visited this link before you,
the file was cached with [leveldb](https://github.com/rvagg/node-levelup).
But if you were to try and grab a bundle that
*nobody else has tried to grab before*, what would happen is this:

* The module gets pulled down from [npm](http://npmjs.org) and installed
* The module gets [browserified](http://browserify.org) as a standalone bundle
* The module gets sent to you, piping hot
* The module gets cached so that you don't have to wait later on

## API

There are a few API endpoints:

### GET /bundle/:module

Get the latest version of :module.

### GET /bundle/:module@:version

Get a version of :module which satisfies the given :version
[semver](https://github.com/rvagg/node-levelup).

### GET /debug-bundle/:module
### GET /debug-bundle/:module@:latest

The same as the prior two, except with `--debug` passed to browserify.

### COMING VAGUELY SOON:

### POST /multi-bundle
### GET /multi-bundle/:existing-bundle

## Places

* [browserify-cdn development site](https://github.com/jesusabdullah/browserify-cdn)
* [browserify on the web](http://browserify.org)
* [browserify development site](https://github.com/substack/node-browserify)
