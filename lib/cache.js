'use strict';

const url = require('url');

const _ = require('lodash');
const level = require('level');
const log = require('minilog')('leveldb');
const NpmPublishStream = require('npm-publish-stream');
const objectHash = require('object-hash');
const Promise = require('bluebird');
const sublevel = require('level-sublevel');
const semver = require('semver');
const ttl = require('level-ttl');

const validate = require('./validate');

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

// instance decorator for aliases cache invalidation
function cull(config, cache) {
  if (!cache) {
    cache = config;
    config = {};
  }

  const refreshRate = _.get(config, 'npm.follower.refreshRate');
  let skimdb = _.get(config, 'npm.skimdb');

  if (skimdb && typeof skimdb === 'string') {
    skimdb = url.parse(skimdb);

    if (skimdb.port) {
      skimdb.port = parseInt(skimdb.port);
    }
    else {
      if (skimdb.protocol === 'https:') {
        skimdb.port = 443;
      }
      else if (skimdb.protocol === 'http:') {
        skimdb.port = 80;
      }
    }

    // THIS LIBRARY IS DUMB and TAKES PROTOCOL IN A WEIRD FORMAT
    skimdb.protocol += '//';
  }
  else {
    skimdb = {};
  }

  if (cache.name !== 'aliases') {
    throw new Error('This decorator should only be used for aliases');
  }

  const db = cache.db;
  const pubStream = new NpmPublishStream({
    refreshRate: refreshRate,
    hostname: skimdb.hostname,
    protocol: skimdb.protocol,
    port: skimdb.port
  });

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
      .then((v) => {
        try {
          return JSON.parse(v)
        }
        catch (parseError) {
          parseError.name = 'JSONParseError';
          throw parseError;
        }
      });
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
        if (err.name !== 'JSONParseError') {
          throw err;
        }
        // Holy shit, something is fucking up the db
        // Try to del the thing and then get
        return this._del(hash).then(() => {
          // Being a little bit of an asshole here
          err.name = 'NotFoundError';
          throw err;
        });
      }).catch((err) => {

        if (err.name !== 'NotFoundError') {
          throw err;
        }

        log.info(`cache: \`${name}\` did not have \`${hash}\`.`);
        return Promise.try(() => {
          return generate();
        }).then((res) => {
          if (!res) {
            const err = new Error(`Acceptable version not found for \`${name}\` with hash \`${hash}\``);
            err.name = 'NotFoundError'
            throw err;
          }

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
  input = validate.validateInput(input);

  const scope = input.module_scope;
  const name = input.module_name;
  const semver = input.module_semver;
  const subfile = input.module_subfile;

  return `${[ scope, name, subfile ].filter((b) => b).join('/')}@${semver}`;

}

function multibundlesHashFxn(input) {
  if (typeof input === 'string' && input.length === 32) {
    log.info('cache: Input for `multibundles` appears to be an md5 hash already');
    return input;
  }
  return defaultHashFxn(input);
};

function statusesHashFxn(input) {
  input = validate.validateInput(input);

  const scope = input.module_scope;
  const name = input.module_name;
  const version = input.module_version;
  const subfile = input.module_subfile;

  return `${[ scope, name, subfile ].filter((b) => b).join('/')}@${version}`;
};

function createCaches(config) {
  
  const db = sublevel(ttl(level(_.get(config, 'level.db'))));

  const bundles = new Cache('bundles', db, {
    ttl: 14 * DAYS
  });

  const aliases = cull(config, new Cache('aliases', db, {
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

