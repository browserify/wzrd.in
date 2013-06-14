var crypto = require('crypto');

var level = require('level'),
    log = require('minilog')('bundler');


//
// LevelDB cache
//
module.exports = function createCache(options, generate) {

  var db = level(options.db);

  return function (body, cb) {

    var hash = md5(JSON.stringify(body));

    log.info('cache: body `' + JSON.stringify(body) + '` has hash `' + hash + '`.');

    log.info('cache: checking leveldb for bundle `' + hash + '`...');

    db.get(hash, function (err, b) {
      if (err && err.name === 'NotFoundError') {

        log.info('cache: did not find bundle `' + hash + '`.');

        return generate(body, function (err, _b) {
          if (err) return cb(err);

          db.put(hash, _b, function (err) {
            cb(err, _b);
          });
        });
      }

      if (!err) {
        log.info('cache: successfully found bundle `' + hash + '`.');
      }

      cb(err, b);
    });
  }
};

function md5 (text) {
  return crypto.createHash('md5').update(text).digest('base64');
}
