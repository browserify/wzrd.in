'use strict';

const path = require('path');

const supertest = require('supertest');
const rimraf = require('rimraf');
const tap = require('tap');

const wzrdin = require('../../');

tap.plan(6);

tap.test('setup', () => {
  return wzrdin.bundler.init();
});

tap.test('singular bundles build the first time', function (t) {
  return supertest(wzrdin.app)
    .get('/standalone/concat-stream@latest')
    .expect(200)
    .expect('content-type', 'text/javascript')
    .then((res) => {
      t.type(res.text, 'string', 'body looks like a bundle');
      t.end();
    });
});

tap.test('singular bundles are cached the second time', function (t) {
  return supertest(wzrdin.app)
    .get('/standalone/concat-stream@latest')
    .expect(200)
    .expect('content-type', 'text/javascript')
    .then((res) => {
      t.type(res.text, 'string', 'body looks like a bundle');
      t.end();
    });
});

tap.test('singular scoped bundles build the first time', function (t) {
  return supertest(wzrdin.app)
    .get('/standalone/@tatumcreative%2Fcolor@latest')
    .expect(200)
    .expect('content-type', 'text/javascript')
    .then((res) => {
      t.type(res.text, 'string', 'body looks like a bundle');
      t.end();
    });
});

tap.test('singular bundles with subfiles build the first time', function (t) {
  return supertest(wzrdin.app)
    .get('/standalone/lodash%2Frange@latest')
    .expect(200)
    .expect('content-type', 'text/javascript')
    .then((res) => {
      t.type(res.text, 'string', 'body looks like a bundle');
      t.end();
    });
});

tap.test('singular bundles of standalone core modules build the first time', function (t) {
  return supertest(wzrdin.app)
    .get('/standalone/events')
    .expect(200)
    .expect('content-type', 'text/javascript')
    .then((res) => {
      t.type(res.text, 'string', 'body looks like a bundle');
      t.end();
    });
});

tap.tearDown(() => {
  wzrdin.bundler._caches._destroy();
  rimraf.sync('./cdn.db');
});
