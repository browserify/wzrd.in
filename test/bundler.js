'use strict';

const Promise = require('bluebird');
const sinon = require('sinon');
const tap = require('tap');

const Bundler = require('../lib/bundler');

const fakeBuilder = {
  init: sinon.stub().returns(Promise.resolve('butts'))
};

let bundler;

tap.plan(2);

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

tap.test('Bundler init', (t) => {
  bundler.init().then(() => {
    t.ok('bundler init succeeded');
    t.ok(fakeBuilder.init.calledOnce, 'builder init was called once');
  }).catch((err) => {
    t.fail(err, 'did not successfully init');
  }).then(() => {
    t.end();
  });
});

