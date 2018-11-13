'use strict';

const path = require('path');

const inject = require('shot').inject;
const rimraf = require('rimraf');
const tap = require('tap');

const wzrdin = require('../../');

function looksLegit(res, t) {
  t.equal(res.statusCode, 200, 'status code is 200');
  t.equal(res.headers['content-type'], 'text/javascript', 'content-type says javascript');
  t.type(res.payload, 'string', 'body looks like a bundle');
}

tap.plan(6);

tap.test('setup', (t) => {
  wzrdin.bundler.init().then(() => t.end(), (err) => { t.fail(err); t.end(); });
});

tap.test('singular bundles build the first time', function (t) {
  return inject(wzrdin.app, { url: '/standalone/concat-stream@latest' }).then((res) => {
    looksLegit(res, t);
    t.end();
  });
});

tap.test('singular bundles are cached the second time', function (t) {
  return inject(wzrdin.app, { url: '/standalone/concat-stream@latest' }).then((res) => {
    looksLegit(res, t);
    t.end();
  });
});

tap.test('singular scoped bundles build the first time', function (t) {
  return inject(wzrdin.app, { url: '/standalone/@tatumcreative%2Fcolor@latest' }).then((res) => {
    looksLegit(res, t);
    t.end();
  });
});

tap.test('singular bundles with subfiles build the first time', function (t) {
  return inject(wzrdin.app, { url: '/standalone/lodash%2Frange@latest' }).then((res) => {
    looksLegit(res, t);
    t.end();
  });
});

tap.test('singular bundles of standalone core modules build the first time', function (t) {
  return inject(wzrdin.app, { url: '/standalone/events' }).then((res) => {
    looksLegit(res, t);
    t.end();
  });
});

tap.tearDown(() => {
  wzrdin.bundler._caches._destroy();
  rimraf('./cdn.db', (err) => { if (err) throw err; });
});
