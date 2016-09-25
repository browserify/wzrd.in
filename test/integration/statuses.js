'use strict';

const path = require('path');

const inject = require('pickleback').inject;
const rimraf = require('rimraf');
const tap = require('tap');

const wzrdin = require('../../');

tap.plan(4);

tap.test('setup', (t) => {
  wzrdin.bundler.init().then(() => t.end(), (err) => { t.fail(err); t.end(); });
})

tap.test('latest has not been built', function (t) {
  inject(wzrdin.app, { url: '/status/concat-stream@latest' }, (res) => {
    t.equal(res.statusCode, 200, 'status code is 200');
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8', 'content-type says json');

    const builds = JSON.parse(res.payload);

    t.doesNotThrow(() => {
      t.equal(builds.module, 'concat-stream', 'module is concat-stream');
      t.equal(Object.keys(builds.builds).length, 0, 'no builds for semver range');
    }, 'returns an object');

    t.end();
  });
});

tap.test('build latest', function (t) {
  inject(wzrdin.app, { url: '/standalone/concat-stream@latest' }, (res) => {
    t.equal(res.statusCode, 200, 'status code is 200');
    t.end();
  });
});

tap.test('latest has been built', function (t) {
  inject(wzrdin.app, { url: '/status/concat-stream@latest' }, (res) => {
    t.equal(res.statusCode, 200, 'status code is 200');
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8', 'content-type says json');

    const builds = JSON.parse(res.payload);

    t.doesNotThrow(() => {
      t.equal(builds.module, 'concat-stream', 'module is concat-stream');
      t.equal(Object.keys(builds.builds).length, 1, 'there is only 1 `latest`');
      t.equal(builds.builds[Object.keys(builds.builds)].ok, true, 'worked correctly');
    }, 'returns an object');

    t.end();
  });
});

tap.teardown(() => {
  wzrdin.bundler._caches._destroy();
  rimraf('./cdn.db', (err) => { if (err) throw err; });
});
