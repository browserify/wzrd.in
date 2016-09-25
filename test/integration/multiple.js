'use strict';

const path = require('path');

const inject = require('pickleback').inject;
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
  wzrdin.bundler.init().then(() => t.end(), (err) => { t.fail(err); t.end(); });
});

tap.test('multi-bundles build the first time', function (t) {
  inject(wzrdin.app, {
    url: '/multi',
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    payload: requestBody
  }, (res) => {
    t.equal(res.statusCode, 200, 'status code is 200');
    t.equal(res.headers['content-type'], 'application/json', 'content-type says json');

    let body = {};

    t.doesNotThrow(function () {
      body = JSON.parse(res.payload);
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
  inject(wzrdin.app, {
    url: '/multi',
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    payload: requestBody
  }, (res) => {
    let body = {};

    t.doesNotThrow(function () {
      body = JSON.parse(res.payload);
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
  rimraf('./cdn.db', (err) => { if (err) throw err; });
});
