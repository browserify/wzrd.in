var util = require('util');

var express = require('express');

var bundler = require('./bundler');

var app = express(),
    bundle = bundler(defaults());

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
      res.setHeader('content-type', 'text/plain');
      return res.end(stringifyError(err));
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

function defaults(opts) {
  var o = opts || {};

  var ds = {
    db: './cdn.db',
    root: './tmp'
  }

  Object.keys(ds).forEach(function (k) {
    if (typeof o[k] === 'undefined' || o[k] === null) {
      o[k] = ds[k];
    }
  });

  return o;
}

function stringifyError(err) {
  var lines = [];

  if (err.stack) {
    lines.push(err.stack);
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

  return lines.join('\n');
}
