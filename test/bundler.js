'use strict';

const Promise = require('bluebird');
const sinon = require('sinon');
const tap = require('tap');

const Bundler = require('../lib/bundler');

const fakeBuild = {};

const fakeBuilder = {
  init: sinon.stub().returns(Promise.resolve('butts')),
  versions: {
    node: '4.5.0'
  },
  build: sinon.stub().returns(Promise.resolve(fakeBuild))
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
  const checkStub = sinon.stub(bundler._caches.aliases, 'check', function() {
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
      t.ok(checkStub.calledOnce, 'alias check was called once');
      t.equal(version, '1.2.3', 'version should be 1.2.3');
    }).then(() => {
      checkStub.reset();
      t.end();
    });
  });

  t.test('core module', (t) => {
    bundler._getAlias({
      module_name: 'assert'
    }).catch((err) => {
      t.fail(err, '_getAlias should have succeeded');
    }).then((version) => {
      t.notOk(checkStub.called, 'alias check should not have been called');

      t.equal(version, bundler._builder.versions.node, 'core module should have builder node version');

      t.end();
    });
  });

  t.tearDown(() => {
    checkStub.restore();
  });
});

tap.test('bundler._getBundle', (t) => {
  const checkStub = sinon.stub(bundler._caches.bundles, 'check', function() {
    return Promise.resolve({ pkg: {}, bundle: '(function(){})()' });
  });

  bundler._getBundle({
    module_name: 'concat-stream',
    module_version: '1.2.3'
  }).catch((err) => {
    t.fail(err, '_getBundle should have succeeded');
  }).then((bundle) => {
    t.ok(bundle, 'gave us a bundle');
    bundle = bundle || {};
    t.same(bundle.pkg, {}, 'bundle looks like it came from our cache stub');
    t.equal(bundle.bundle, '(function(){})()', 'bundle definitely came from our cache stub');

    checkStub.restore();

    t.end();
  });
});

tap.test('bundler._recordBuildStatus', (t) => {
  t.plan(2);

  const putStub = sinon.stub(bundler._caches.statuses, 'put', function() {
    return Promise.resolve();
  });

  const testInput = {
    module_name: 'concat-stream',
    module_version: '1.2.3'
  };

  const testBuild = {
    debug: {
      module_name: 'concat-stream',
      module_version: '1.2.3'
    }
  };

  t.test('on pass', (t) => {
    bundler._recordBuildStatus(testInput, Promise.resolve(testBuild)).then(() => {
      t.ok(putStub.calledOnce, 'put stub was called once');

      t.same(putStub.lastCall.args[0], testInput, 'put stub was called with input as key');
      t.same(putStub.lastCall.args[1], { ok: true }, 'put stub was called with passing build state');

      putStub.reset();

      t.end();
    });
  });

  t.test('on fail', (t) => {
    const buildError = new Error('failed build lol');
    buildError.metadata = 'some metadata';

    bundler._recordBuildStatus(testInput, Promise.reject(buildError)).then(() => {
      t.ok(putStub.calledOnce, 'put stub was called once');
      t.same(putStub.lastCall.args[0], testInput, 'put stub was called with input as key');
      t.same(putStub.lastCall.args[1], {
        ok: false,
        error: {
          message: buildError.message,
          stack: buildError.stack,
          metadata: buildError.metadata
        }
      }, 'put stub was called with failing build state');

      putStub.restore();

      t.end();
    });
  });
});

tap.test('bundler._build', (t) => {
  const recordStub = sinon.stub(bundler, '_recordBuildStatus', function() {
    return Promise.resolve();
  });

  const input = {
    module_name: 'concat-stream',
    module_version: '1.2.3'
  };

  bundler._build(input)
    .catch((err) => {
      t.fail(err, '_build should have succeeded');
    }).then((build) => {
      t.equal(build, fakeBuild, 'should have returned a build');
      t.ok(fakeBuilder.build.calledOnce, 'buildStub was called once');
      t.ok(fakeBuilder.build.calledWith(input), '_builder.build was called with input');
    }).then(() => {
      fakeBuilder.build.reset();
      recordStub.restore();
      t.end();
    })
  ;
});
