var util = require('util');

var express = require('express');

var bundler = require('./lib/bundler');

var app = express(),
    bundle = bundler(defaults());

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
  }, function (err, b) {
    if (err) {
      res.setHeader('content-type', 'text/plain');
      return res.end(stringifyError(err));
    }
    res.setHeader('content-type', 'text/javascript');
    res.end(b);
  });
});

//
// Exports
//
exports.app = app;
exports.bundler = bundler;

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

//
// If you're using express, it will take an existing req.body, otherwise
// you'd better be using JSON >:|
//
function getBody(req, cb) {
  if (req.body) {
    smooth(req.body);
  }
  else {
    req.pipe(concat(smooth));
  }

  function smooth(_body) {
    var body = _body;

    try {

      if (Buffer.isBuffer(_body)) {
        body = JSON.parse(_body.toString());
      }

      if (typeof _body === 'string') {
        body = JSON.parse(_body);
      }

      cb(null, body);
    }
    catch (err) {
      cb(err);
    }
  }
}
