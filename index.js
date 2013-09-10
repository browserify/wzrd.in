var express = require('express'),
    log = require('minilog')('browserify-cdn'),
    cors = require('cors');

var bundler = require('./bundler'),
    defaults = require('./defaults'),
    requestLogger = require('./request-logger');

var app = express(),
    bundle = bundler(defaults());

var singular = require('./singular'),
    multiple = require('./multiple'),
    buildstatus = require('./buildstatus');

//
// Add static assets
//
app.use(requestLogger);
app.use(app.routes);
app.use(cors());
app.use(express.static(__dirname + '/public'));

//
// Single-module bundles
//
singular(app, bundle);

//
// Multiple-module bundles
//
multiple(app, bundle);

//
// Report build statuses
//
buildstatus(app, bundle);

//
// Exports
//
exports.app = app;
exports.bundler = bundler;
exports.defaults = defaults;
