var path = require('path');

var tap = require('tap'),
    supertest = require('supertest'),
    rimraf = require('rimraf');

var cdn = require('../').app;

var requestBody = JSON.stringify({
  dependencies: {
    'concat-stream': 'latest'
  },
  options: {
    fullPaths: true
  }
});


tap.test('multi-bundles build the first time', function (t) {
  supertest(cdn)
    .post('/multi')
    .send(requestBody)
    .expect('Content-Type', 'application/json')
    .expect(200)
    .end(function (err, res) {
      t.error(err, 'Posting to /multi doesn\'t explode');

      console.log(res.text) // delete this...

      var body = {};

      t.doesNotThrow(function () {
        body = JSON.parse(res.text);
      }, 'body is valid JSON');

      var module = 'concat-stream'
      console.log(body[module].bundle)
      t.notEqual(body[module].bundle.indexOf(module), -1, module + ' includes bundle');

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
