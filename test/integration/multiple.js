var path = require('path');

var tap = require('tap'),
    supertest = require('supertest'),
    rimraf = require('rimraf');

var cdn = require('../').app;

var requestBody = JSON.stringify({
  dependencies: {
    'concat-stream': 'latest',
    'mux': '0.0.x' /*,
    'jsonml-stringify/dom': 'latest'
    */
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

      var body = {};

      t.doesNotThrow(function () {
        body = JSON.parse(res.text);
      }, 'body is valid JSON');

      [
        'concat-stream',
        'mux' /*,
        'jsonml-stringify/dom'
        */
      ].forEach(function (module) {
        t.type(body[module], 'object', module + ' is included');

        body[module] = body[module] || {};
        t.type(body[module].package, 'object', module + ' has package');

        body[module].package = body[module].package || {};
        t.equal(body[module].package.name, module.split('/').shift(), module + ' package has expected name');

        t.ok(body[module].package.readme, module + ' package has a readme');

        t.type(body[module].bundle, 'string', module + ' includes bundle');
      });
      t.end();
    })
  ;
});

tap.test('multi-bundles are cached the second time', function (t) {
  supertest(cdn)
    .post('/multi')
    .send(requestBody)
    .expect('Content-Type', 'application/json')
    .expect(200)
    .end(function (err, res) {
      t.error(err, 'Posting to /multi doesn\'t explode');

      var body = {};

      t.doesNotThrow(function () {
        body = JSON.parse(res.text);
      }, 'body is valid JSON');

      [
        'concat-stream',
        'mux', /*
        'jsonml-stringify/dom'
        */
      ].forEach(function (module) {
        t.type(body[module], 'object', module + ' is included');

        body[module] = body[module] || {};
        t.type(body[module].package, 'object', module + ' has package');

        body[module].package = body[module].package || {};
        t.equal(body[module].package.name, module.split('/').shift(), module + ' package has expected name');

        t.type(body[module].bundle, 'string', module + ' includes bundle');
      });
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
