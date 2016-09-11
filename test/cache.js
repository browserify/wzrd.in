'use strict';

const EventEmitter = require('events').EventEmitter;

const Promise = require('bluebird');
const sinon = require('sinon');
const tap = require('tap');

const cacheLib = require('../lib/cache');

const mockSubDb = {
  get: sinon.stub().yields(null, '{}'),
  put: sinon.stub().yields(null),
  del: sinon.stub().yields(null)
};

const mockDb = {
  sublevel: sinon.stub().returns(mockSubDb)
};

const mockHashFxn = sinon.stub().returns('hash_browns');

tap.test('Cache', (t) => {
  let cache;

  t.plan(3);

  t.test('Cache constructor', (t) => {
    t.doesNotThrow(() => {
      cache = new cacheLib.Cache('test-cache', mockDb, {
        hashfxn: mockHashFxn
      });
    }, 'constructs successfully');

    t.ok(mockDb.sublevel.called, 'sublevel on mock db was called once');
    t.ok(mockDb.sublevel.calledWith('test-cache'), 'sublevel was initialized with input value');
    t.equal(cache.db, mockSubDb, 'has our mock sub-db');
    t.equal(cache.hashfxn, mockHashFxn, 'has our mock hash function');

    t.end();
  });

  t.test('getters/setters', (t) => {
    t.plan(6);

    t.test('cache._get', (t) => {
      cache._get('key')
        .then((val) => {
          t.same(val, {}, 'returned an expected value');
          t.ok(mockSubDb.get.calledOnce, 'db get was called once');
          t.ok(mockSubDb.get.calledWith('key'), 'db get was called with raw key');
          t.notOk(mockHashFxn.callCount, 'hash fxn was not called');
        })
        .catch((err) => {
          t.fail(err, '_get should have succeeded');
        })
        .then(() => {
          mockSubDb.get.reset();
          mockHashFxn.reset();
          t.end();
        })
      ;
    });

    t.test('cache.get', (t) => {
      cache.get('key')
        .then((val) => {
          t.same(val, {}, 'returned an expected value');
          t.ok(mockSubDb.get.calledOnce, 'db get was called once');
          t.ok(mockSubDb.get.calledWith('hash_browns'), 'db get was called with hashed key');
          t.ok(mockHashFxn.calledOnce, 'hash fxn was called once');
          t.ok(mockHashFxn.calledWith('key'), 'hash fxn was called with raw key');
        })
        .catch((err) => {
          t.fail(err, 'get should have succeeded');
        })
        .then(() => {
          mockSubDb.get.reset();
          mockHashFxn.reset();
          t.end();
        });
      ;
    });

    t.test('cache._put', (t) => {
      cache._put('key', {}, { some: 'option' })
        .then(() => {
          t.ok(mockSubDb.put.calledOnce, 'db put was called once');
          t.ok(mockSubDb.put.calledWith('key', '{}', { some: 'option' }), 'db put was called with raw key, serialized object and options');
          t.notOk(mockHashFxn.callCount, 'hash fxn was not called');
        })
        .catch((err) => {
          t.fail(err, '_put should have succeeded');
        })
        .then(() => {
          mockSubDb.put.reset();
          mockHashFxn.reset();
          t.end();
        });
      ;
    });

    t.test('cache.put', (t) => {
      cache.put('key', {}, { some: 'option' })
        .then(() => {
          t.ok(mockSubDb.put.calledOnce, 'db put was called once');
          t.ok(mockSubDb.put.calledWith('hash_browns', '{}', { some: 'option' }), 'db put was called with hashed key, serialized object and options');
          t.ok(mockHashFxn.calledOnce, 'hash fxn was called once');
          t.ok(mockHashFxn.calledWith('key'), 'hash fxn was called with raw key');
        })
        .catch((err) => {
          t.fail(err, 'put should have succeeded');
        })
        .then(() => {
          mockSubDb.put.reset();
          mockHashFxn.reset();
          t.end();
        });
      ;
    });

    t.test('cache._del', (t) => {
      cache._del('key')
        .then(() => {
          t.ok(mockSubDb.del.calledOnce, 'db get was called once');
          t.ok(mockSubDb.del.calledWith('key'), 'db del was called with raw key');
          t.notOk(mockHashFxn.callCount, 'hash fxn was not called');
        })
        .catch((err) => {
          t.fail(err, 'del should have succeeded');
        })
        .then(() => {
          mockSubDb.del.reset();
          mockHashFxn.reset();
          t.end();
        });
      ;
    });

    t.test('cache.del', (t) => {
      cache.del('key')
        .then(() => {
          t.ok(mockSubDb.del.calledOnce, 'db get was called once');
          t.ok(mockSubDb.del.calledWith('hash_browns'), 'db del was called with hashed key');
          t.ok(mockHashFxn.calledOnce, 'hash fxn was called once');
          t.ok(mockHashFxn.calledWith('key'), 'hash fxn was called with raw key');
        })
        .catch((err) => {
          t.fail(err, 'del should have succeeded');
        })
        .then(() => {
          mockSubDb.del.reset();
          mockHashFxn.reset();
          t.end();
        });
      ;
    });
  });

  t.test('check', (t) => {
    t.plan(2);

    const valueGenerator = sinon.stub().returns(Promise.resolve({ generated: 'value' }));

    t.test('while warm', (t) => {
      cache.check('key', valueGenerator).catch((err) => {
        t.fail(err, 'check should have succeeded');
      }).then((val) => {
        t.ok(cache.db.get.calledOnce, 'db get was called once');
        t.ok(cache.db.get.calledWith('hash_browns'), 'db get was called with hashed key');
        t.notOk(valueGenerator.callCount, 'value generator was not called');
        t.same(val, {}, 'check yielded cached value');

        cache.db.get.reset();
        valueGenerator.reset();

        t.end();
      });
    });

    t.test('while cold', (t) => {
      const mockNotFoundError = new Error('not found lol');
      mockNotFoundError.name = 'NotFoundError';
      cache.db.get = sinon.stub().yields(mockNotFoundError);

      cache.check('key', valueGenerator).catch((err) => {
        t.fail(err, 'check should have succeeded');
      }).then((val) => {
        t.ok(cache.db.get.calledOnce, 'db get was called once');
        t.ok(cache.db.get.calledWith('hash_browns'), 'db get was called with hashed key');
        t.ok(valueGenerator.calledOnce, 'value generator was called once');
        t.same(val, { generated: 'value' });

        t.end();
      });
    });
  });
});

tap.test('cull decorator', (t) => {
  // TODO: Test for multiple dist-tags

  const stubKeyStream = new EventEmitter();
  mockSubDb.createKeyStream = sinon.stub().returns(stubKeyStream);

  t.throws(() => {
    cacheLib.cull({ db: mockSubDb });
  }, 'fails to decorate without right name');

  const stubCacheDel = sinon.stub();

  let culledCache;
  t.doesNotThrow(() => {
    culledCache = cacheLib.cull({
      name: 'aliases',
      db: mockSubDb,
      _del: stubCacheDel
    });
  }, 'decorates successfully');

  const createKeyStreamSpy = sinon.spy(culledCache, 'createKeyStream');

  t.ok(culledCache._pubStream, 'has a _pubStream');
  t.ok(culledCache._cullHandler, 'has a _cullHandler');

  // Get rid of garbage pub stream, call _cullHandler directly
  const oldPubStream = culledCache._pubStream;

  t.doesNotThrow(() => {
    oldPubStream.destroy();
  }, 'publish stream is destroyable (good riddance!)');

  culledCache._cullHandler({
    doc: {
      name: 'concat-stream',
      'dist-tags': {
        latest: '1.2.3'
      }
    }
  });

  t.ok(createKeyStreamSpy.calledOnce, 'createKeyStream called once');
  t.ok(createKeyStreamSpy.calledWith('concat-stream'), 'createKeyStream called with module name');

  stubKeyStream.emit('data', 'concat-stream@1.2.x');

  t.ok(stubCacheDel.calledOnce, 'cache del was called once');
  t.ok(stubCacheDel.calledWith('concat-stream@1.2.x'), 'cache del was called with `concat-stream@1.2.x`');

  stubCacheDel.reset();

  stubKeyStream.emit('data', 'concat-stream@1.1.x');

  t.notOk(stubCacheDel.called, 'cache del was not called');

  stubCacheDel.reset();

  stubKeyStream.emit('data', 'concat-stream@latest');

  t.ok(stubCacheDel.calledOnce, 'cache del was called once for dist-tag');
  t.ok(stubCacheDel.calledWith('concat-stream@latest'), 'cache del was called with `concat-stream@latest`');

  t.end();
});

tap.test('hash functions', (t) => {
  t.plan(2);

  t.test('aliases hash function', (t) => {
    t.plan(2);

    t.test('with scope', (t) => {
      const result = cacheLib.aliasesHashFxn({
        module_scope: '@jfhbrook',
        module_name: 'pretzel',
        module_semver: '1.2.x'
      });

      t.equal(result, '@jfhbrook/pretzel@1.2.x', 'value is correct');
      t.end();
    });

    t.test('without scope', (t) => {
      const result = cacheLib.aliasesHashFxn({
        module_scope: '',
        module_name: 'zippy',
        module_semver: '0.x'
      });

      t.equal(result, 'zippy@0.x', 'value is correct');
      t.end();
    });
  });

  t.test('statuses hash function', (t) => {
    t.plan(2);

    t.test('with scope', (t) => {
      const result = cacheLib.statusesHashFxn({
        module_scope: '@jfhbrook',
        module_name: 'pretzel',
        module_version: '1.2.3'
      });

      t.equal(result, '@jfhbrook/pretzel@1.2.3', 'value is correct');
      t.end();
    });

    t.test('without scope', (t) => {
      const result = cacheLib.statusesHashFxn({
        module_scope: '',
        module_name: 'zippy',
        module_version: '0.0.1'
      });

      t.equal(result, 'zippy@0.0.1');
      t.end();
    });
  });
});
