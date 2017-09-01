'use strict';

const tap = require('tap');

const core = require('../lib/node-core');

tap.test('core.test', (t) => {
  t.plan(2);

  t.test('a core module', (t) => {
    t.ok(core.test('assert'));
    t.end();
  });

  t.test('not a core module', (t) => {
    t.notOk(core.test('pony'));
    t.end();
  });
});
