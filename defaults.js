module.exports = function defaults(opts) {
  var o = opts || {};

  var ds = {
    db: './cdn.db',
    root: './tmp'
  }

  Object.keys(ds).forEach(function (k) {
    if (typeof o[k] === 'undefined' || o[k] === null) {
      o[k] = ds[k];
    }
  });

  return o;
}
