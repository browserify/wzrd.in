# browserify-as-a-service

[![Build Status](https://travis-ci.org/browserify/wzrd.in.png?branch=production)](https://travis-ci.org/browserify/wzrd.in)

#### Places

* [fork me on github](https://github.com/browserify/wzrd.in)
* [browserify on the web](http://browserify.org)
* [browser-module-sandbox](https://github.com/maxogden/browser-module-sandbox) - helpful for using multi-bundles
* [requirebin.com](http://requirebin.com) - powered by wzrd.in
* [esnextb.in](http://esnextb.in) - also powered by wzrd.in

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

## Heroku Installation

browserify-cdn is ready to run on Heroku:

```sh
heroku create my-browserify-cdn
git push heroku master
heroku ps:scale web=1
```

## Docker Installation

You can build and run an image doing the following:

```sh
docker build -t "wzrd.in" /path/to/wzrd.in
docker run -p 8080:8080 wzrd.in
```

Keep in mind that a new deploy will wipe the cache.

## License

MIT
