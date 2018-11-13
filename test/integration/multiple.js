'use strict';

const path = require('path');

const supertest = require('supertest');
const rimraf = require('rimraf');
const tap = require('tap');

const wzrdin = require('../../');

const requestBody = JSON.stringify({
  dependencies: {
    'concat-stream': 'latest',
    'mux': '0.0.x'
  }
});

tap.plan(3);

tap.test('setup', (t) => {
  return wzrdin.bundler.init();
});

tap.test('multi-bundles build the first time', function (t) {
  return supertest(wzrdin.app)
    .post('/multi')
    .set('content-type', 'application/json')
    .set('accept', 'application/json')
    .send(requestBody)
    .expect(200)
    .expect('content-type', 'application/json')
    .then((res) => {
      let body = {};

      t.doesNotThrow(function () {
        body = JSON.parse(res.text);
      }, 'body is valid JSON');

      [
        'concat-stream',
        'mux'
      ].forEach(function (module) {
        t.type(body[module], 'object', module + ' is included');

        t.comment(Object.keys(body[module]));

        body[module] = body[module] || {};
        t.type(body[module].package, 'object', module + ' has package');

        body[module].package = body[module].package || {};
        t.equal(body[module].package.name, module.split('/').shift(), module + ' package has expected name');

        t.ok(body[module].package.readme, module + ' package has a readme');

        t.type(body[module].bundle, 'string', module + ' includes bundle');
      });
      t.end();
    });
});

tap.test('multi-bundles are cached the second time', function (t) {
  return supertest(wzrdin.app)
    .post('/multi')
    .set('content-type', 'application/json')
    .set('accept', 'application/json')
    .send(requestBody)
    .expect(200)
    .expect('content-type', 'application/json')
    .then((res) => {
      let body = {};

      t.doesNotThrow(function () {
        body = JSON.parse(res.text);
      }, 'body is valid JSON');

      [
        'concat-stream',
        'mux'
      ].forEach(function (module) {
        t.type(body[module], 'object', module + ' is included');

        body[module] = body[module] || {};
        t.type(body[module].package, 'object', module + ' has package');

        body[module].package = body[module].package || {};
        t.equal(body[module].package.name, module.split('/').shift(), module + ' package has expected name');

        t.type(body[module].bundle, 'string', module + ' includes bundle');
      });
      t.end();
    });
});

tap.teardown(() => {
  wzrdin.bundler._caches._destroy();
  rimraf.sync('./cdn.db');
});
