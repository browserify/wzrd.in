# browserify-as-a-service

#### Places

* [fork me on github](https://github.com/jesusabdullah/browserify-cdn)
* [browserify on the web](http://browserify.org)
* [browser-module-sandbox](https://github.com/maxogden/browser-module-sandbox) - helpful for using multi-bundles
* [requirebin.com](http://requirebin.com) - powered by browserify-cdn

# Quick Start

Try visiting this link:

[/standalone/concat-stream@latest](http://wzrd.in.nyud.net/standalone/concat-stream@latest)

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
[semver](https://github.com/rvagg/node-levelup) range. Defaults to latest.

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

"options" is where you get to set "debug" and "standalone". Usually, in this
case, you'll probably only really care about debug. If you don't define
"options", this will default to `{ "debug": false, "standalone": false }`.
"dependencies" is an npm-style deps hash.

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

If you saved the Location url from the POST earlier, you can just GET it instead of
POSTing again.

## License

MIT
