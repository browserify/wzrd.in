'use strict';

const semver = require('semver');
const tap = require('tap');

const Builder = require('../builder');

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

const INIT_TIMEOUT= 5 * MINUTES;
const BUILD_TIMEOUT = 2 * MINUTES;
const DEFAULT_TIMEOUT = 5 * SECONDS;

tap.setTimeout(INIT_TIMEOUT + BUILD_TIMEOUT + DEFAULT_TIMEOUT);
tap.plan(3);

let builder;
tap.test('Builder constructor', (t) => {
  t.doesNotThrow(() => {
    builder = new Builder();
  }, 'constructs successfully');
  t.end();
});

tap.test('builder.init', (t) => {
  t.setTimeout(INIT_TIMEOUT);

  builder.init().then((result) => {
    t.end();
  }).catch((err) => {
    t.fail(err, 'did not successfully init');
    t.end();
  });
});

tap.test('builder._build creates a bundle -- standalone concat-stream', (t) => {
  t.setTimeout(BUILD_TIMEOUT);

  builder.build({
    module_name: 'concat-stream',
    module_version: '1.5.2',
    standalone: true
  }).then((results) => {
    t.ok(results);
    results = results || {};

    t.equal(results.code, 0, 'exit code is 0');

    t.ok(results.debug, 'debug block is defined');
    const debug = results.debug || {};

    t.equal(debug.module_scope, '', 'module_scope is blank');
    t.equal(debug.module_name, 'concat-stream', 'module_name is concat-stream');
    t.equal(debug.module_version, '1.5.2', 'module_version is 1.5.2');
    t.equal(debug.module_subfile, '', 'module_subfile is blank');
    t.equal(debug.standalone, true, 'standalone is true');
    t.equal(debug.debug, false, 'debug is false');
    t.equal(debug.full_paths, false, 'full_paths is false');

    t.ok(debug.versions, 'versions block is defined');
    const versions = debug.versions || {};

    const expectedNodeVersion = process.version.split('.').shift();
    t.match(versions.node, new RegExp(`^${expectedNodeVersion}`), `node is ${expectedNodeVersion}`);

    t.type(versions.npm, 'string', 'npm sure has a version alright');

    const expectedPackageVersions = require('../builder/container/package.json').dependencies;
    [ 'browserify', 'uglify-js' ].forEach((pkg) => {
      const range = expectedPackageVersions[pkg];
      try {
        t.ok(semver.satisfies(versions[pkg], range), `${pkg} is ${range} (actual: ${versions[pkg]})`);
      } catch (err) {
        throw new Error('pkg' + versions[pkg]);
      }
    });

    t.type(results.logs, 'string', 'logs are a string');

    t.ok(results.pkg, 'pkg block is defined');
    const pkg = results.pkg || {};

    t.type(pkg.readme, 'string', 'readme is a string');
    t.ok(pkg.readme.length, 'readme has length');

    t.ok(results.bundle, 'bundle is defined');
    const bundle = results.bundle || '';
    t.ok(results.bundle.length, 'bundle has length');

    t.end();
    
  }).catch((err) => {
    t.fail(err);
    t.end();
  });
});
