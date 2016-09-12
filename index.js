'use strict';

const http = require('http');

const _ = require('lodash');
const express = require('express');
const minilog = require('minilog');
const cors = require('cors');
const compression = require('compression');

const Bundler = require('./lib/bundler');

const requestLogger = require('./middlewares/request-logger');

const config = require('./config');
const routes = require('./routes');

const app = express();

const bundler = new Bundler(config);

app.routes = new express.Router(), bundler, config;
routes(app.routes, bundler, config);

app.use(require('cors')(config.cors));
app.use(require('compression')());
app.use(require('./middlewares/request-logger'));
app.use(app.routes);
app.use(express.static(__dirname + '/public'));

require('./routes')(app.routes, bundler, config);

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
  }).done();
}

exports.start = start;
exports.app = app;
exports.bundler = bundler;
exports.config = config;

