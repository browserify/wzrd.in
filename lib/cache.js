var level = require('level'),
    crypto = require('crypto');

//
// LevelDB cache
//
module.exports = function createCache(options, generate) {

  var db = level(options.db);

  return function (body, cb) {
    var hash = md5(JSON.stringify(body));

    db.get(hash, function (err, b) {
      if (err && err.name === 'NotFoundError') {
        return generate(body, function (err, _b) {
          if (err) return cb(err);

          db.put(hash, _b, function (err) {
            cb(err, _b);
          });
        });
      }

      cb(err, b);
    });
  }
};

function md5 (text) {
  return crypto.createHash('md5').update(text).digest('base64');
}
