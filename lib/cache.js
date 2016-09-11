'use strict';

const level = require('level');
const log = require('minilog')('leveldb');
const NpmPublishStream = require('npm-publish-stream');
const objectHash = require('object-hash');
const Promise = require('bluebird');
const sublevel = require('level-sublevel');
const semver = require('semver');
const ttl = require('level-ttl');

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

// instance decorator for aliases cache invalidation
function cull(cache, options) {
  // TODO: Move to central config
  options = Object.assign({
    refreshRate: 2 * MINUTES,
    hostname: 'skimdb.npmjs.com',
    port: 443,
    protocol: 'https://'
  }, options || {});

  if (cache.name !== 'aliases') {
    throw new Error('This decorator should only be used for aliases');
  }

  const db = cache.db;
  const pubStream = new NpmPublishStream(options);

  cache.createKeyStream = function(prefix) {
    // concat-stream -- concat-strean
    const start = prefix;
    const end = start.slice(0, prefix.length - 1)
              + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1);

    return this.db.createKeyStream({ start: start, end: end });
  };

  cache._destroy = cache.destroy;

  cache.destroy = function() {
    this._pubStream.destroy();
    return cache._destroy();
  };

  cache._cullHandler = function(data) {
    // I just happen to know that the name (should, anyway) already has the
    // format of the key prior to the '@'.
    const prefix = data.doc.name;

    const dist_tags = data.doc['dist-tags'];

    // Should invalidate anything that has a dist-tag
    // TODO: Mad overkill for any project with tons of dist-tags, any way to
    // figure out what the update was?
    Object.keys(dist_tags).forEach((tag) => {
      const module_version = dist_tags[tag];

      const stream = this.createKeyStream(prefix);

      stream.on('data', (key) => {
        log.info('cull stream on data', key);

        // Grab the semver range used in the key
        const module_semver = key.split('@').pop();

        // If this alias has been invalidated by the tagged version...
        if (semver.satisfies(module_version, module_semver) || module_semver == tag) {
          log.info(`culling \`${key}\`...`);
          this._del(key);
        }
      });
    });
  };
  pubStream.on('data', (data) => cache._cullHandler(data));

  pubStream.on('error', (err) => {
    log.info('pubstream error:', err.message);
    log.info(err.stack);
  });

  cache._pubStream = pubStream;

  return cache;
}

class Cache {
  constructor(name, db, opts) {
    opts = opts || {}
    this.db = db.sublevel(name);
    this.name = name;
    this.hashfxn = opts.hashfxn || opts.hashFunction || defaultHashFxn
    this.ttl = opts.ttl;
  }

  destroy() {
    return Promise.fromCallback((cb) => this.db.close(cb));
  }

  _get(key) {
    return Promise.fromCallback((cb) => this.db.get(key, cb))
      .then((v) => JSON.parse(v));
  }

  get(key) {
    return Promise.try(() => {
      return this._get(this.hashfxn(key));
    });
  }

  _put(key, val, opts) {
    return Promise.try(() => {
      return Promise.fromCallback((cb) => this.db.put(key, JSON.stringify(val), opts, cb));
    });
  }

  put(key, val, opts) {
    return Promise.try(() => {
      return this._put(this.hashfxn(key), val, opts);
    });
  }

  _del(key) {
    return Promise.try(() => {
      return Promise.fromCallback((cb) => this.db.del(key, cb));
    });
  }

  del(key) {
    return Promise.try(() => {
      return this._del(this.hashfxn(key));
    });
  }

  check(body, generate) {
    const hash = this.hashfxn(body);
    const db = this.db;
    const name = this.name;
    const ttl = this.ttl;

    log.info(`cache: checking \`${name}\` for hash \`${hash}\`...`);

    return this._get(hash)
      .catch((err) => {
        if (err.name !== 'NotFoundError') {
          throw err;
        }

        log.info(`cache: \`${name}\` did not have \`${hash}\`.`);
        return Promise.try(() => {
          return generate();
        }).then((res) => {
          log.info(
            `cache: saving hash \`${hash}\` in \`${name}\` ${(
              (typeof ttl === 'number')
                ? `with ttl ${ttl}...`
                : '...'
            )}`
          );

          if (ttl) {
            return this._put(hash, res, { ttl: ttl }).then(finish);
          }
          return this._put(hash, res).then(finish);

          function finish() {
            log.info(`saved hash \`${hash}\` in \`${name}\`.`);
            return res;
          }
        });
      })
    ;
  };
}

function defaultHashFxn(o) {
  return objectHash(o);
}

function aliasesHashFxn(input) {
  const scope = input.module_scope || '';
  const name = input.module_name;
  const semver = input.module_semver;

  let key = `${name}@${semver}`;

  if (scope) {
    key = `${scope}/${key}`;
  }

  return key;
}

function multibundlesHashFxn(input) {
  if (typeof input === 'string' && input.length === 32) {
    log.info('cache: Input for `multibundles` appears to be an md5 hash already');
    return input;
  }
  return defaultHashFxn(input);
};

function statusesHashFxn(input) {
  const scope = input.module_scope;
  const name = input.module_name;
  const version = input.module_version;

  let key = `${name}@${version}`;

  if (scope) {
    key = `${scope}/${key}`;
  }

  return key;
};

function createCaches(location) {
  const db = sublevel(ttl(level(location)));

  const bundles = new Cache('bundles', db, {
    ttl: 14 * DAYS
  });

  const aliases = cull(new Cache('aliases', db, {
    hashfxn: aliasesHashFxn,
    ttl: 1 * DAYS
  }));

  const multibundles = new Cache('multibundles', db, {
    hashfxn: multibundlesHashFxn,
    ttl: 30 * DAYS
  });

  const statuses = new Cache('statuses', db, {
    hashfxn: statusesHashFxn,
    ttl: 30 * DAYS
  });

  return {
    _db: db,
    _destroy: function() {
      return Promise.all([
        bundles.destroy(),
        multibundles.destroy(),
        aliases.destroy(),
        statuses.destroy()
      ]);
    },
    bundles: bundles,
    multibundles: multibundles,
    aliases: aliases,
    statuses: statuses
  };
};

module.exports = {
  cull: cull,
  Cache: Cache,
  createCaches: createCaches,
  defaultHashFxn: defaultHashFxn,
  aliasesHashFxn: aliasesHashFxn,
  multibundlesHashFxn: multibundlesHashFxn,
  statusesHashFxn: statusesHashFxn
};

