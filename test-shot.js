'use strict';

const http = require('http');

const express = require('express');
const shot = require('shot');

const app = express();

app.get('/foo', function(req, res, next) {
  console.log('foo');
  res.end('foo');
});

console.log('injecting');
shot.inject(app, { url: '/foo' }, (res) => {
  console.log('responded');
  console.log(res);
});
