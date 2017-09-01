'use strict';

const _ = require('lodash');
const semver = require('semver');
const sinon = require('sinon');
const tap = require('tap');

const Builder = require('../builder');

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

const BOOTSTRAP_TIMEOUT= 2 * MINUTES;
const BUILD_TIMEOUT = 1 * MINUTES;
const DEFAULT_TIMEOUT = 5 * SECONDS;

const NODE_VERSION = /^6/;

tap.plan(7);
tap.setTimeout(BOOTSTRAP_TIMEOUT + 3 * BUILD_TIMEOUT + 3 * DEFAULT_TIMEOUT);

let builder;

tap.test('Builder constructor', (t) => {
  t.setTimeout(DEFAULT_TIMEOUT);

  t.doesNotThrow(() => {
    builder = new Builder();
  }, 'constructs successfully');
  t.end();
});

tap.test('builder.bootstrap', (t) => {
  t.setTimeout(BOOTSTRAP_TIMEOUT);

  builder.bootstrap().then((result) => {
    t.pass('successfully bootstrapped');
  }).catch((err) => {
    t.fail(err, 'did not successfully bootstrap');
  }).then(() => t.end());
});

tap.test('builder.init', (t) => {
  builder.init().then((result) => {
    t.pass('successfully initialized');
    t.ok(builder.versions, 'builder has versions');
    const versions = builder.versions || {};
    t.ok(versions.node, 'builder has a node version');
    t.match(versions.node, NODE_VERSION, 'sure looks like a node version alright');
  }).catch((err) => {
    t.fail(err, 'did not successfully init');
  }).then(() => {
    t.end();
  });
});

function assertStatusCode(results, t) {
  t.equal(_.get(results, 'code'), 0, 'exit code is 0');
}

const expectedPackageVersions = require('../builder/container/package.json').dependencies;

function assertVersions(results, t) {
  t.ok(_.get(results, 'debug.versions'), 'version block is defined');
  t.match(_.get(results, 'debug.versions.node'), NODE_VERSION, 'node sure looks like a version');
  t.type(_.get(results, 'debug.versions.npm'), 'string', 'npm sure has a version alright');

  [ 'browserify', 'uglify-js' ].forEach((pkg) => {
    const range = expectedPackageVersions[pkg];
    // TODO: Extra?
    t.ok(semver.satisfies(_.get(results, `debug.versions.${pkg}`), range), `${pkg} is ${range} (actual: ${_.get(results, 'debug.versions.' + pkg)})`);
  });
}

function assertLogs(results, t) {
  t.comment(results.logs);
  t.ok(results.logs, 'logs are a string alright', { diagnostic: true });
}

function assertBundle(results, t, options) {
  const isStandalone = _.get(options, 'standalone');
  const isCore = _.get(options, 'core');

  t.ok(_.get(results, 'package'), 'pkg block is defined');
  if (!isCore) {
    t.type(_.get(results, 'package.readme'), 'string', 'readme is a string');
    t.ok(_.get(results, 'package.readme.length'), 'readme has content');
  }
  if (isStandalone) {
    t.match(_.get(results, 'bundle'), /^\(function\(f\){/, 'looks like a bundle alright');
  }
  else {
    t.match(_.get(results, 'bundle'), /^require=function e\(t,n,r\)/, 'looks like a bundle alright');
  }
}

function assertModuleScope(results, t, scope) {
  scope = scope || '';
  t.equal(_.get(results, 'debug.module_scope'), scope, `module_scope is \`${scope}\``);
}

function assertModuleName(results, t, name) {
  t.equal(_.get(results, 'debug.module_name'), name, `module_name is \`${name}\``);
}

function assertModuleVersion(results, t, version) {
  t.equal(_.get(results, 'debug.module_version'), version, `module_version is \`${version}\``);
}

function assertModuleSubfile(results, t, subfile) {
  subfile = subfile || '';
  t.equal(_.get(results, 'debug.module_subfile'), subfile, `module_subfile is \`${subfile}\``);
}

function assertStandalone(results, t, isStandalone) {
  t.equal(_.get(results, 'debug.standalone'), isStandalone, `standalone is \`${isStandalone}\``);
}

function assertDebug(results, t, isDebug) {
  t.equal(_.get(results, 'debug.debug'), isDebug, `debug is \`${isDebug}\``);
}

function assertFullPaths(results, t, isFullPaths) {
  t.equal(_.get(results, 'debug.full_paths'), isFullPaths, `full_paths is \`${isFullPaths}\``);
}

tap.test('builder._build creates a bundle -- standalone concat-stream', (t) => {
  t.setTimeout(BUILD_TIMEOUT);

  builder.build({
    module_name: 'concat-stream',
    module_version: '1.5.2',
    standalone: true
  }).then((results) => {
    t.ok(results);
    assertStatusCode(results, t);

    assertModuleScope(results, t);
    assertModuleName(results, t, 'concat-stream');
    assertModuleVersion(results, t, '1.5.2');
    assertModuleSubfile(results, t);
    assertStandalone(results, t, true);
    assertDebug(results, t, false);
    assertFullPaths(results, t, false);

    assertVersions(results, t);
    assertLogs(results, t);
    assertBundle(results, t, { standalone: true });

    t.end();
  }).catch((err) => {
    t.fail(err);
    t.end();
  });
});

tap.test('builder._build creates a bundle -- standalone lodash - subfile range', (t) => {
  t.setTimeout(BUILD_TIMEOUT);

  builder.build({
    module_name: 'lodash',
    module_subfile: 'range',
    module_version: '4.15.0',
    standalone: true
  }).then((results) => {
    t.ok(results);
    assertStatusCode(results, t);

    assertModuleScope(results, t);
    assertModuleName(results, t, 'lodash');
    assertModuleVersion(results, t, '4.15.0');
    assertModuleSubfile(results, t, 'range');
    assertStandalone(results, t, true);
    assertDebug(results, t, false);
    assertFullPaths(results, t, false);

    assertVersions(results, t);
    assertLogs(results, t);
    assertBundle(results, t, { standalone: true });

    t.end();
  }).catch((err) => {
    t.fail(err);
    t.end();
  });
});

tap.test('builder._build creates a bundle -- core module events', (t) => {
  t.setTimeout(BUILD_TIMEOUT);

  builder.build({
    module_name: 'events'
  }).then((results) => {
    t.ok(results);
    assertStatusCode(results, t);

    assertModuleScope(results, t);
    assertModuleName(results, t, 'events');
    assertStandalone(results, t, false);
    assertDebug(results, t, false);
    assertFullPaths(results, t, false);

    assertVersions(results, t);
    assertLogs(results, t);
    assertBundle(results, t, { core: true });

    t.end();
  }).catch((err) => {
    t.fail(err);
    t.end();
  });
});



tap.test('two builds at the same time', (t) => {
  const fakeInput = {
    node_module: 'concat-stream',
    node_version: '1.2.3'
  };
  const fakeBuild = {};

  const buildStub = sinon.stub(builder, '_build', function() {
    return Promise.resolve(fakeBuild);
  });

  const hashStub = sinon.stub(Builder, '_hash', function() {
    return 'hash_browns';
  });

  Promise.all([
    builder.build(fakeInput),
    builder.build(fakeInput)
  ]).then((builds) => {
    t.equal(builds[0], fakeBuild, 'first build is our expected build');
    t.equal(builds[1], fakeBuild, 'second build is our expected build');

    t.ok(buildStub.calledOnce, 'builder._build was called once');
    t.ok(buildStub.calledWith(fakeInput), 'builder._build was called with expected input');

    t.ok(hashStub.calledTwice, 'Builder._hash was called twice');
    t.notOk(builder._inProgress['hash_browns'], 'in-progress build was cleaned up');

    buildStub.restore();
    hashStub.restore();
    t.end();
  });
});
