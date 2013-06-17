var request = require('request'),
    semver = require('semver');

//
// Find tarballs on npm
//
var registry = module.exports = function get(module, version, cb) {
  registry.resolve(module, version, function (err, v) {
    if (err) return cb(err);

    return cb(null, registry.download(module, v));
  });
};

registry.metadata = function metadata(module, cb) {
  request('http://registry.npmjs.org/' + module, function (err, res, body) {
    try {
      cb(err, JSON.parse(body));
    }
    catch (err) {
      err.body = body;
      cb(err);
    }
  });
};

registry.resolve = function resolve(module, version, cb) {
  registry.metadata(module, function (err, data) {
    if (err) {
      return cb(err);
    }

    var v;

    try {
      if (version === 'latest') {
        v = data['dist-tags'].latest;
      }
      else if (!semver.validRange(version)) {
        console.log('not a valid range ' + version);

        v = Object.keys(data.versions)
          .filter(function (v) {
            return v === version;
          })
          [0]
        ;
      }
      else {
        v = Object.keys(data.versions)
          .filter(function (v) {
            return semver.satisfies(v, version);
          })
          .sort(function (a, b) {
            return semver.lte(a, b);
          })
          [0]
        ;
      }
    }
    catch (e) {
      console.log(e);
      v = null;
    }

    if (!v) {
      var e = new Error('No match for semver `' + version + '` found');
      e.versions = Object.keys(data.versions);
      return cb(e);
    }

    cb(null, v);
  });
};

registry.download = function download(module, version) {
  return request(
    'http://registry.npmjs.org/' +
    module + '/-/' +
    module + '-' + version + '.tgz'
  );
};
