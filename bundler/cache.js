var crypto = require('crypto');

var level = require('level'),
    ttl = require('level-ttl'),
    sublevel = require('level-sublevel'),
    cull = require('./npm-cull'),
    log = require('minilog')('leveldb');

var Cache = function (name, db, opts) {
  opts = opts || {}
  this.db = db.sublevel(name);
  this.name = name;
  this.hashfxn = opts.hashfxn || opts.hashFunction || defaultHashFxn
  this.ttl = opts.ttl;
};

Cache.prototype.get = function get(key, cb) {
  this.db.get(this.hashfxn(key), function (err, v) {
    if (err) return cb(err);
    return cb(null, JSON.parse(v));
  });
};

Cache.prototype.put = function put(key, val, cb) {
  this.db.put(this.hashfxn(key), JSON.stringify(val), cb);
};

Cache.prototype.check = function check(body, generate, cb) {
  var hash = this.hashfxn(body),
      db = this.db,
      name = this.name,
      ttl = this.ttl;

  log('cache: checking `' + name + '` for hash `' + hash + '`...');

  db.get(hash, function (err, res) {

    if (err && err.name === 'NotFoundError') {

      log('cache: `' + name + '` did not have `' + hash + '`.');
      return generate(function (err, _res) {
        if (err) return cb(err);

        log(
          'cache: saving hash `' + hash + '` in `' + name + '` ' + (
            (typeof ttl === 'number')
              ? 'with ttl ' + ttl +'...'
              : '...'
          )
        );

        if (ttl) {
          db.put(hash, JSON.stringify(_res), { ttl: ttl }, finish);
        }
        else {
          db.put(hash, JSON.stringify(_res), finish);
        }

        function finish(err) {
          log('saved hash `' + hash + '` in `' + name + '`.');
          cb(err, _res);
        }
      });
    }

    cb(err, JSON.parse(res));
  });
};

var SECONDS = 1000,
    MINUTES = 60 * SECONDS,
    HOURS = 60 * MINUTES,
    DAYS = 24 * HOURS;

var c = module.exports = function (location) {

  var db = sublevel(ttl(level(location)));

  var bundles, multibundles, aliases, statuses;

  bundles = new Cache('bundles', db, {
    ttl: 30 * DAYS
  });

  aliases = cull(new Cache('aliases', db, {
    hashfxn: function (o) {
      return o.module + '@' + o.semver;
    },
    ttl: 1 * DAYS
  }));

  multibundles = new Cache('multibundles', db, {
    hashfxn: function (o) {
      if (typeof o === 'string' && o.length === 32) {
        log('cache: Input for `multibundles` appears to be an md5 hash already');
        return o;
      }
      return defaultHashFxn(o);
    },
    ttl: 30 * DAYS
  });

  statuses = new Cache('statuses', db, {
    hashfxn: function (o) {
      return o.module + '@' + o.semver;
    },
    ttl: 30 * DAYS
  });

  return {
    bundles: bundles,
    multibundles: multibundles,
    aliases: aliases,
    statuses: statuses,
    defaultHashFxn: defaultHashFxn
  };
};

c.defaultHashFxn = defaultHashFxn;
c.Cache = Cache;

function defaultHashFxn(o) {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(o))
    .digest('hex')
  ;
}
