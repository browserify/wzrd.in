'use strict';

const http = require('http');

const _ = require('lodash');
const express = require('express');
const minilog = require('minilog');

const Bundler = require('./lib/bundler');

const config = require('./config');
const routes = require('./routes');

const app = express();

const bundler = new Bundler(config);

const router = new express.Router();
routes(router, bundler, config);

app.use(require('cors')(config.cors));
app.use(require('compression')());
app.use(require('./middlewares/request-logger'));
app.use(router);
app.use(express.static(__dirname + '/public'));

function start(callback) {
  callback = callback || ((err) => { if (err) { throw err; } });

  const log = minilog('browserify-cdn');

  minilog
    .pipe(minilog.backends.console.formatNpm)
    .pipe(minilog.backends.console)
  ;

  bundler.init().then(() => {

    const server = http.createServer(app).listen(_.get(config, 'server.port'), function (err) {
      if (err) return callback(err);

      const addr = server.address();

      log.info('browserify-cdn is online');
      log.info('http://' + addr.address + ':' + addr.port);

      callback(null, server);
    });
  }, (err) => {
    callback(err);
  }, (err) => setImmediate(() => { throw err; }));
}

exports.start = start;
exports.app = app;
exports.bundler = bundler;
exports.config = config;

