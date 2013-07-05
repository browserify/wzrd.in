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

tap.test('teardown', function (t) {
  rimraf(path.resolve(__dirname, '../cdn.db'), function (err) {
    t.error(err, 'removed the database');
    t.end();
    setTimeout(function () {
      process.stderr.write('# killing this because supertest is hanging\n');
      process.exit(0);
    }, 5000);
  });
});
