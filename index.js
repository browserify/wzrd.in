var util = require('util');

var express = require('express'),
    log = require('minilog')('browserify-cdn');

var bundler = require('./bundler'),
    defaults = require('./defaults'),
    requestLogger = require('./request-logger');

var app = express(),
    bundle = bundler(defaults());

//
// Add static assets
//
app.use(requestLogger);
app.use(app.routes);
app.use(express.static(__dirname + '/public'));

//
// Standalone bundles
//
app.get('/bundle/:module', function (req, res) {
  var t = req.params.module.split('@'),
      module = t.shift(),
      version;

  if (t.length) {
    version = t.shift();
  }
  else {
    version = 'latest';
  }

  bundle({
    module: module,
    version: version,
    standalone: true
  }, serveBundle(res));
});

//
// Standalone DEBUG bundles
//
app.get('/debug-bundle/:module', function (req, res) {
  var t = req.params.module.split('@'),
      module = t.shift(),
      version;

  if (t.length) {
    version = t.shift();
  }
  else {
    version = 'latest';
  }

  bundle({
    module: module,
    version: version,
    standalone: true,
    debug: true
  }, serveBundle(res));
});

function serveBundle(res) {
  return function (err, bundle) {
    if (err) {
      var lines = [];

      if (err.stack) {
        err.stack.split('\n').forEach(function (l) {
          lines.push(l);
        });
      }
      else if (err.message) {
        lines.push(err.message);
      }
      else {
        lines.push('unspecified error');
      }

      Object.keys(err).forEach(function (k) {
        lines.push(k + ': ' + util.format(err[k]));
      });

      lines.forEach(function (l) {
        log.error(l);
      });

      res.setHeader('content-type', 'text/plain');
      res.statusCode = 500;

      res.write('---FLAGRANT SYSTEM ERROR---\n');
      res.write('\n');
      if (err.message) {
        res.write('Error: "' + err.message + "'");
      }
      else {
        res.write('Error: An unspecified error has occurred.\n');
        res.write('(Yes, I know. How helpful.)\n');
      }
      res.write('\n');
      res.write('Get ahold of @jesusabdullah on freenode or twitter with\n');
      res.write('the ENTIRETY of the contents of this message, and he can\n');
      res.write('try to help you out.\n');
      res.write('\n');

      Object.keys(err).forEach(function (k) {
        res.write(k + ': ' + JSON.stringify(err[k]) + '\n');
      });
      res.write('\n');
      return res.end('Have a nice day!\n\n');
    }
    res.setHeader('content-type', 'text/javascript');
    res.end(bundle);
  };
}

//
// Exports
//
exports.app = app;
exports.bundler = bundler;
exports.defaults = defaults;
exports.serveBundle = serveBundle;
