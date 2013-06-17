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

          log(
            'cache: saving hash `' + hash + '` in `' + name +
            (typeof ttl === 'number')
              ? 'with ttl ' + ttl +'...'
              : '...'
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

  function defaultHashFxn(o) {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(o))
      .digest('base64')
    ;
  }
};

var SECONDS = 1000,
    MINUTES = 60 * SECONDS,
    HOURS = 60 * MINUTES,
    DAYS = 24 * HOURS;

module.exports = function (location) {

  var cache = new Cache(location),
      bundles, aliases;

  bundles = cache.open('bundles', {
    ttl: 30 * DAYS
  });

  // We don't want LRU caching for this; We want straight expiry.
  aliases = cache.open('aliases', {
    hashfxn: function (o) {
      return o.module + '@' + o.semver;
    },
    ttl: 1 * DAYS
  });

  return { bundles: bundles, aliases: aliases };
};
