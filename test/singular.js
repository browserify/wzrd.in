var path = require('path');

var tap = require('tap'),
    supertest = require('supertest'),
    rimraf = require('rimraf');

var cdn = require('../').app;

tap.test('singular bundles build the first time', function (t) {
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

tap.test('singular bundles are cached the second time', function (t) {
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

tap.test('singular scoped bundles build the first time', function (t) {
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

/*
tap.test('singular bundles with subfiles build the first time', function (t) {
  supertest(cdn)
    .get('/standalone/jsonml-stringify%2Fdom@latest')
    .expect('Content-Type', 'text/javascript')
    .expect(200)
    .end(function (err, res) {
      t.error(err, 'requesting /standalone/jsonml-stringify%2Fdom@latest doesn\'t explode');
      t.end();
    })
  ;
});
*/

tap.test('singular bundles of standalone core modules build the first time', function (t) {
  supertest(cdn)
    .get('/standalone/events')
    .expect('Content-Type', 'text/javascript')
    .expect(200)
    .end(function (err, res) {
      t.error(err, 'requesting /standalone/events doesn\'t explode');
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
