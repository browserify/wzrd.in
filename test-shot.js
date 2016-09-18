'use strict';

const http = require('http');

const express = require('express');
const shot = require('shot');

const requestLogger = require('./middlewares/request-logger');

const app = express();

app.use(require('./middlewares/request-logger'));

app.get('/foo', function(req, res, next) {
  res.end('foo');
});

console.log('injecting');
shot.inject(app, { url: '/foo' }, (res) => {
  console.log('responded');
  console.log(res);
});
