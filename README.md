# browserify-as-a-service

[![Build Status](https://travis-ci.org/browserify/wzrd.in.png?branch=master)](https://travis-ci.org/browserify/wzrd.in)

# Notice

jfhbrook doesn't maintain this anymore. If you have machine problems, try to contact goto-bus-stop, who has ssh keys.

#### Places

* [fork me on github](https://github.com/jfhbrook/browserify-cdn)
* [browserify on the web](http://browserify.org)
* [browser-module-sandbox](https://github.com/maxogden/browser-module-sandbox) - helpful for using multi-bundles
* [requirebin.com](http://requirebin.com) - powered by browserify-cdn
* [esnextb.in](http://esnextb.in) - also powered by browserify-cdn

# Quick Start

Try visiting this link:

[/standalone/concat-stream@latest](https://wzrd.in/standalone/concat-stream@latest)

Also, [wzrd.in](https://wzrd.in) has a nice url generating form.

## What just happened?

Well, in *this* case, since someone has visited this link before you,
the file was cached with [leveldb](https://github.com/rvagg/node-levelup).
But if you were to try and grab a bundle that
*nobody else has tried to grab before*, what would happen is this:

* The module gets pulled down from [npm](http://npmjs.org) and installed
* The module gets [browserified](http://browserify.org) as a standalone bundle
* The module gets sent to you, piping hot
* The module gets cached so that you don't have to wait later on

# API

There are a few API endpoints:

## GET /bundle/:module

Get the latest version of :module.

## GET /bundle/:module@:version

Get a version of `:module` which satisfies the given `:version`
[semver range](https://github.com/isaacs/node-semver#ranges). Defaults to latest.

## GET /debug-bundle/:module
## GET /debug-bundle/:module@:version

The same as the prior two, except with `--debug` passed to browserify.

## GET /standalone/:module
## GET /standalone/:module@:version

In this case, `--standalone` is passed to browserify.

## GET /debug-standalone/:module
## GET /debug-standalone/:module@:version

Both `--debug` and `--standalone` are passed to browserify!

## POST /multi

POST a body that looks something like this:

```json
{
  "options": {
    "debug": true
  },
  "dependencies": {
    "concat-stream": "0.1.x",
    "hyperstream": "0.2.x"
  }
}
```

"options" is where you get to set "debug", "standalone", and "fullPaths".
Usually, in this case, you'll probably only really care about debug. If you
don't define "options", it will default to
`{ "debug": false, "standalone": false, "fullPaths": false }`.

What you get in return looks something like this:

```
HTTP/1.1 200 OK
X-Powered-By: Express
Location: /multi/48GOmL0XvnRZn32bkpz75A==
content-type: application/json
Date: Sat, 22 Jun 2013 22:36:32 GMT
Connection: keep-alive
Transfer-Encoding: chunked

{
  "concat-stream": {
    "package": /* the concat-stream package.json */,
    "bundle": /* the concat-stream bundle */
  },
  "hyperstream": {
    "package": /* the hyperstream package.json */,
    "bundle": /* the hyperstream bundle */
  }
}
```

The bundle gets permanently cached at `/multi/48GOmL0XvnRZn32bkpz75A==` for
future GETs.

## GET /multi/:existing-bundle

If you saved the Location url from the POST earlier, you can just GET it
instead of POSTing again.

## GET /status/:module
## GET /status/:module@:version

Get information on the build status of a module. Returns build information for
all versions which satisfy the given semver (or latest in the event of a
missing semver).

Blobs generally look something like this:

```
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 109
ETag: "-9450086"
Date: Sun, 26 Jan 2014 08:05:59 GMT
Connection: keep-alive

{
  "module": "concat-stream",
  "builds": {
    "1.4.1": {
      "ok": true
    }
  }
}
```

The "module" and "builds" fields should both exist. Keys for "builds" are the
versions. Properties:

* "ok": Whether the package has last built or not
* "error": If the package was built *insuccessfully* ("ok" is
false), this property will contain information about the error

Versions which have not been built will not be keyed onto "builds".

## Installation/Operation

wzrd.in requires [docker](https://www.docker.com/) to run, which it uses to
create build environments.

Once docker is installed, do the typical steps:

```
git clone git@github.com:jfhbrook/wzrd.in.git
cd wzrd.in
npm install
```

App configuration is handled via environment variables:

* `WZRDIN_ADMIN_USER`: The wzrd.in admin username, used for basic auth against
  administrative routes (defaults to null, rejecting all admin routes)
* `WZRDIN_ADMIN_PASS`: The wzrd.in admin password, used for basic auth against
  administrative routes (defaults to null, rejecting all admin routes)
* `WZRDIN_DOCKER_TAG`: The docker tag used for the wzrd.in builder image (defaults to `browserify-builder`)
* `WZRDIN_CORS_ORIGIN`: Specifies the origin(s) allowed by cors (defaults to `*`)
* `WZRDIN_CORS_METHODS`: A comma-separated list of methods allowed by cors (defaults to `GET,POST`)
* `WZRDIN_LEVEL_DB`: The folder location of the cache's leveldb store (defaults to `./cdn.db`)
* `WZRDIN_NPM_REGISTRY`: The connection string for the npm registry (defaults to `https://registry.npmjs.com`)
* `WZRDIN_NPM_SKIMDB`: The connection for the npm skimdb, used for purging the cache on public package updates (defaults to `https://skimdb.npmjs.com:443`)
* `WZRDIN_NPM_FOLLOWER_REFRESHRATE`: The refresh rate, in milliseconds, for the skimdb follower (defaults to 2 minutes)
* `PORT`: The port listened to by wzrd.in (defaults to 8080)

Before starting wzrd.in, you have to build the docker image used by the
builder. This can be done by properly configuring your environment (ie, setting
`WZRDIN_DOCKER_TAG` as appropriate) and running:

```
npm run bootstrap
```

Once that's done, you should be off to the races:

```
npm start
```

Note that running wzrd.in in docker itself is currently unsupported.


## License

MIT/X11, see LICENSE file.
