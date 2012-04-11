var crypto = require('crypto');

exports.md5 = function md5 (text) {
  return crypto.createHash('md5').update(text).digest('base64');
};
