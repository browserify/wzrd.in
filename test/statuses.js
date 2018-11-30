var path = require('path');

var tap = require('tap'),
    supertest = require('supertest'),
    rimraf = require('rimraf');

var cdn = require('../').app;

tap.test('latest has not been built', function (t) {
  supertest(cdn)
    .get('/status/concat-stream@latest')
    .expect('Content-Type', 'application/json; charset=utf-8') // due to res.json
    .expect(200)
    .end(function (err, res) {
      t.ok(!err, 'requesting /status/concat-stream@latest doesn\'t explode');

      var builds = JSON.parse(res.text);

      t.doesNotThrow(function () {
        t.equal(builds.module, 'concat-stream', 'module is concat-stream');
        t.equal(Object.keys(builds.builds).length, 0, 'no builds for semver range');
      }, 'returns an object');
      t.end();
    })
  ;
});

tap.test('build latest', function (t) {
  supertest(cdn)
    .get('/standalone/concat-stream@latest')
    .expect('Content-Type', 'text/javascript')
    .expect(200)
    .end(function (err, res) {
      t.error(err, 'requesting /standalone/concat-stream@latest doesn\'t explode');
      t.end();
    })
  ;
});

tap.test('latest has been built', function (t) {
  supertest(cdn)
    .get('/status/concat-stream@latest')
    .expect('Content-Type', 'application/json; charset=utf-8') // due to res.json
    .expect(200)
    .end(function (err, res) {
      t.ok(!err, 'requesting /status/concat-stream@latest doesn\'t explode');

      var builds = JSON.parse(res.text);

      t.doesNotThrow(function () {
        t.equal(builds.module, 'concat-stream', 'module is concat-stream');
        t.equal(Object.keys(builds.builds).length, 1, 'there is only 1 `latest`');
        t.equal(builds.builds[Object.keys(builds.builds)].ok, true, 'worked correctly');
      }, 'returns an object');
      t.end();
    })
  ;
});

tap.test('latest scoped has not been built', function (t) {
  supertest(cdn)
    .get('/status/@tatumcreative%2Fcolor@latest')
    .expect('Content-Type', 'application/json; charset=utf-8') // due to res.json
    .expect(200)
    .end(function (err, res) {
      t.ok(!err, 'requesting /status/@tatumcreative%2Fcolor@latest doesn\'t explode');

      var builds = JSON.parse(res.text);

      t.doesNotThrow(function () {
        t.equal(builds.module, '@tatumcreative/color', 'module is @tatumcreative/color');
        t.equal(Object.keys(builds.builds).length, 0, 'no builds for semver range');
      }, 'returns an object');
      t.end();
    })
  ;
});

tap.test('build latest scoped', function (t) {
  supertest(cdn)
    .get('/standalone/@tatumcreative%2Fcolor@latest')
    .expect('Content-Type', 'text/javascript')
    .expect(200)
    .end(function (err, res) {
      t.error(err, 'requesting /standalone/@tatumcreative%2Fcolor@latest doesn\'t explode');
      t.end();
    })
  ;
});

tap.test('latest scoped has been built', function (t) {
  supertest(cdn)
    .get('/status/@tatumcreative%2Fcolor@latest')
    .expect('Content-Type', 'application/json; charset=utf-8') // due to res.json
    .expect(200)
    .end(function (err, res) {
      t.ok(!err, 'requesting /status/@tatumcreative%2Fcolor@latest doesn\'t explode');

      var builds = JSON.parse(res.text);

      t.doesNotThrow(function () {
        t.equal(builds.module, '@tatumcreative/color', 'module is @tatumcreative/color');
        t.equal(Object.keys(builds.builds).length, 1, 'there is only 1 `latest`');
        t.equal(builds.builds[Object.keys(builds.builds)].ok, true, 'worked correctly');
      }, 'returns an object');
      t.end();
    })
  ;
});


tap.test('teardown', function (t) {
  rimraf('./cdn.db', function (err) {
    t.error(err, 'removed the database');
    t.end();
    setTimeout(function () {
      process.stderr.write('# killing this because supertest is hanging\n');
      process.exit(0);
    }, 2000);
  });
});
