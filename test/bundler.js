'use strict';

const Promise = require('bluebird');
const sinon = require('sinon');
const tap = require('tap');

const Bundler = require('../lib/bundler');

const fakeBuilder = {
  init: sinon.stub().returns(Promise.resolve('butts')),
  versions: {
    node: '4.5.0'
  }
};

let bundler;

tap.test('Bundler constructor', (t) => {
  t.doesNotThrow(() => {
    bundler = new Bundler({
      db: './cdn.db'
    });
  }, 'constructs successfully');

  bundler._builder = fakeBuilder;

  bundler._caches._destroy();

  t.end();
});

tap.test('bundler.init', (t) => {
  bundler.init().then(() => {
    t.ok('bundler init succeeded');
    t.ok(fakeBuilder.init.calledOnce, 'builder init was called once');
  }).catch((err) => {
    t.fail(err, 'did not successfully init');
  }).then(() => {
    t.end();
  });
});

tap.test('bundler._getAlias', (t) => {
  const checkSpy = sinon.stub(bundler._caches.aliases, 'check', function() {
    return Promise.resolve('1.2.3');
  });

  t.plan(2);

  t.test('non-core module', (t) => {
    bundler._getAlias({
      module_name: 'concat-stream',
      module_semver: '1.2.x'
    }).catch((err) => {
      t.fail(err, '_getAlias should have succeeded');
    }).then((version) => {
      t.ok(checkSpy.calledOnce, 'alias check was called once');
      t.equal(version, '1.2.3', 'version should be 1.2.3');
    }).then(() => {
      checkSpy.reset();
      t.end();
    });
  });

  t.test('core module', (t) => {
    bundler._getAlias({
      module_name: 'assert'
    }).catch((err) => {
      t.fail(err, '_getAlias should have succeeded');
    }).then((version) => {
      t.notOk(checkSpy.called, 'alias check should not have been called');

      t.equal(version, bundler._builder.versions.node, 'core module should have builder node version');

      t.end();
    });
  });

  t.tearDown(() => {
    checkSpy.restore();
  });
});
