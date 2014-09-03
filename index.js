var express = require('express'),
    log = require('minilog')('browserify-cdn'),
    cors = require('cors');

var bundler = require('./bundler'),
    defaults = require('./defaults'),
    admin = require('./admin'),
    requestLogger = require('./request-logger');

var app = express(),
    bundle = bundler(defaults());

var singular = require('./singular'),
    multiple = require('./multiple'),
    statuses = require('./statuses');

//
// Add static assets
//
app.use(requestLogger);
app.use(app.routes);
app.use(cors());
app.use(express.static(__dirname + '/public'));

//
// Admin REST API
//
admin(app, bundle);

//
// Single-module bundles
//
singular(app, bundle);

//
// Multiple-module bundles
//
multiple(app, bundle);

//
// Build statuses
//
statuses(app, bundle);

//
// Exports
//
exports.app = app;
exports.bundler = bundler;
exports.defaults = defaults;
