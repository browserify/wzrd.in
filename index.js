'use strict';

const http = require('http');

const express = require('express');
const minilog = require('minilog');
const cors = require('cors');
const compression = require('compression');

const Bundler = require('./lib/bundler');

const requestLogger = require('./middlewares/request-logger');

const config = require('./defaults'),

const app = express();

const bundler = new Bundler(config);

const routes = require('./routes');
app.routes = routes(new express.Router(), bundler);

app.use(require('cors')());
app.use(require('compression')());
app.use(require('./middlewares/request-logger')());
app.use(app.routes);
app.use(express.static(__dirname + '/public'));

function start(callback) {
  callback = callback || (err) => { if (err) { throw err; } };

  const log = minilog('browserify-cdn');

  minilog
    .pipe(minilog.backends.console.formatNpm)
    .pipe(minilog.backends.console)
  ;

  http.createServer(app).listen(process.env.PORT || process.argv[2] || 8080, function (err) {
    if (err) return callback(err);

    const addr = server.address();

    log.info('browserify-cdn is online');
    log.info('http://' + addr.address + ':' + addr.port);

    callback(null, server);
  });
}

exports.start = start;
exports.app = app;
exports.bundler = bundler;
exports.config = config;

