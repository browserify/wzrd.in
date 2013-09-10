var crypto = require('crypto');

var level = require('level'),
    ttl = require('level-ttl'),
    sublevel = require('level-sublevel'),
    cull = require('./npm-cull'),
    log = require('minilog')('leveldb');

var Cache = function (location) {
  this.db = sublevel(ttl(level(location)));
};

Cache.prototype.open = function (name, options) {
  var db = this.db.sublevel(name),
      hashfxn = options.hashFunction || defaultHashFxn,
      ttl = options.ttl;

  return new SubCache(name, db, options);
};

function SubCache (name, db, options) {
  this.name = name;
  this.db = db;
  this.options = options;
}

SubCache.prototype.check = function (body, generate, cb) {

  var db = this.db,
      options = this.options,
      name = this.name,
      hashfxn = options.hashFunction || defaultHashFxn,
      ttl = options.ttl,
      hash = hashfxn(body);

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

SubCache.prototype.put = function (key, value, callback) {
  this.db.put(key, JSON.stringify(value), callback);
};

SubCache.prototype.get = function (key, callback) {
  this.db.get(key, callback);
};

SubCache.prototype.getAllStream = function (callback) {
  return this.db.createReadStream();
};

var SECONDS = 1000,
    MINUTES = 60 * SECONDS,
    HOURS = 60 * MINUTES,
    DAYS = 24 * HOURS;

var c = module.exports = function (location) {

  var cache = new Cache(location),
      bundles, multibundles, aliases, buildstatuses;

  bundles = cache.open('bundles', {
    ttl: 30 * DAYS
  });

  aliases = cache.open('aliases', {
    hashfxn: function (o) {
      return o.module + '@' + o.semver;
    },
    ttl: 1 * DAYS
  });

  multibundles = cache.open('multibundles', {
    hashfxn: function (o) {
      if (typeof o === 'string' && o.length === 24) {
        log('cache: Input for `multibundles` appears to be an md5 hash already');
        return o;
      }
      return defaultHashFxn(o);
    },
    ttl: 30 * DAYS
  });

  buildstatuses = cache.open('buildstatuses', {
    ttl: 365 * DAYS
  });

  cull(cache);

  return {
    bundles: bundles,
    multibundles: multibundles,
    aliases: aliases,
    buildstatuses: buildstatuses,
    defaultHashFxn: defaultHashFxn
  };
};

c.defaultHashFxn = defaultHashFxn;

function defaultHashFxn(o) {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(o))
    .digest('base64')
  ;
}
