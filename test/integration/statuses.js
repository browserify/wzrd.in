'use strict';

const path = require('path');

const inject = require('shot').inject;
const supertest = require('supertest');
const rimraf = require('rimraf');
const tap = require('tap');

const wzrdin = require('../../');

tap.plan(4);

tap.test('setup', (t) => {
  return wzrdin.bundler.init();
})

tap.test('latest has not been built', function (t) {
  return supertest(wzrdin.app)
    .get('/status/concat-stream@latest')
    .set('accept', 'application/json')
    .expect(200)
    .expect('content-type', 'application/json; charset=utf-8')
    .then((res) => {
      const builds = res.body;

      t.doesNotThrow(() => {
        t.equal(builds.module, 'concat-stream', 'module is concat-stream');
        t.equal(Object.keys(builds.builds).length, 0, 'no builds for semver range');
      }, 'returns an object');

      t.end();
    });
});

tap.test('build latest', function () {
  return supertest(wzrdin.app)
    .get('/standalone/concat-stream@latest')
    .expect(200);
});

tap.test('latest has been built', function (t) {
  return supertest(wzrdin.app)
    .get('/status/concat-stream@latest')
    .set('accept', 'application/json')
    .expect(200)
    .expect('content-type', 'application/json; charset=utf-8')
    .then((res) => {
      const builds = res.body;

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
  rimraf.sync('./cdn.db');
});
