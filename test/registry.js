'use strict';

const semver = require('semver');
const tap = require('tap');

// TODO: de-singleton this!
const Registry = require('../lib/registry');

const testModule = 'concat-stream';

let registry;

tap.test('Registry', (t) => {
  t.plan(4);

  t.test('Registry constructor', (t) => {
    t.doesNotThrow(() => {
      registry = new Registry();
    }, 'constructs successfully');

    t.end();
  });

  t.test('registry.metadata', (t) => {
    t.plan(1);

    t.test('null scope', (t) => {
      registry.metadata(null, testModule)
        .then((result) => {
          t.ok(result, 'expected result');
          t.ok(result.name, 'result has a name');
          t.ok(result.description, 'result has a description');
          t.ok(result.author, 'result has an author');
          t.ok(result['dist-tags'], 'result has a dist-tags');
        })
        .catch((err) => {
          t.fail(err, 'metadata should have succeeded');
        })
        .then(() => {
          t.end();
        })
      ;
    });
  });

  t.test('registry.resolve', (t) => {
    t.plan(1);

    t.test('for latest, null scope', (t) => {
      registry.resolve(null, testModule, 'latest')
        .then((result) => {
          t.ok(result, 'returned an expected value');
          t.ok(semver.valid(result), 'value is a valid semver');
        }).catch((err) => {
          t.fail(err, 'resolve should have succeeded');
        }).then(() => {
          t.end();
        })
      ;
    });
  });

  t.test('registry.versions', (t) => {
    t.plan(1);

    t.test('for latest', (t) => {
      registry.versions(null, testModule, 'latest')
        .then((result) => {
          t.ok(result, 'returned an expected value');
          t.type(result, Array, 'value is an array');
          result.forEach((v) => {
            t.type(v, 'string', 'each value is a string');
          });
        }).catch((err) => {
          t.fail(err, 'versions should have succeeded');
        }).then(() => {
          t.end();
        })
      ;
    });
  });

});
