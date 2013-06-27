var crypto = require('crypto');

var level = require('level'),
    ttl = require('level-ttl'),
    sublevel = require('level-sublevel'),
    log = require('minilog')('leveldb');

var Cache = function (location) {
  this.db = sublevel(ttl(level(location)));
};

Cache.prototype.open = function (name, options) {
  var db = this.db.sublevel(name),
      hashfxn = options.hashFunction || defaultHashFxn,
      ttl = options.ttl;

  return function check(body, generate, cb) {

    var hash = hashfxn(body);

    log('cache: checking `' + name + '` for hash `' + hash + '`...');

    db.get(hash, function (err, res) {

      if (err && err.name === 'NotFoundError') {

        log('cache: `' + name + '` did not have `' + hash + '`.');
        return generate(function (err, _res) {
          if (err) return cb(err);

          if (typeof _res !== 'string' || !_res.length) {
            return cb(new Error('result not non-zero-length string (' + JSON.stringify(_res) + ')'));
          }

          log(
            'cache: saving hash `' + hash + '` in `' + name + '` ' + (
              (typeof ttl === 'number')
                ? 'with ttl ' + ttl +'...'
                : '...'
            )
          );

          if (ttl) {
            db.put(hash, _res, { ttl: ttl }, finish);
          }
          else {
            db.put(hash, _res, finish);
          }

          function finish(err) {
            log('saved hash `' + hash + '` in `' + name + '`.');
            cb(err, _res);
          }
        });
      }

      cb(err, res);
    });
  };
};

var SECONDS = 1000,
    MINUTES = 60 * SECONDS,
    HOURS = 60 * MINUTES,
    DAYS = 24 * HOURS;

var c = module.exports = function (location) {

  var cache = new Cache(location),
      bundles, multibundles, aliases;

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

  return {
    bundles: bundles,
    multibundles: multibundles,
    aliases: aliases,
    defaultHashFxn: defaultHashFxn,
    db: cache.db
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
