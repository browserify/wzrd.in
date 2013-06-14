var request = require('request'),
    semver = require('semver');

//
// Find tarballs on npm
//
var registry = module.exports = function get(module, version, cb) {
  registry.metadata(module, function (err, data) {
    if (err) {
      return cb(err);
    }

    var v;

    try {
      if (version === 'latest') {
        v = data['dist-tags'].latest;
      }
      else if (!semver.valid(version)) {
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
            return semver.satisfies(version, v);
          })
          .sort(function (a, b) {
            return semver.lt(a, b);
          })
          [0]
        ;
      }
    }
    catch (e) {
      return cb(new Error('No matching version for `' + version + '` found'));
    }

    cb(null, registry.download(module, v));

  });
};

registry.metadata = function metadata(module, cb) {
  request('http://registry.npmjs.org/' + module, function (err, res, body) {
    try {
      cb(err, JSON.parse(body));
    }
    catch (err) {
      cb(err);
    }
  });
};

registry.download = function download(module, version) {
  return request(
    'http://registry.npmjs.org/' +
    module + '/-/' +
    module + '-' + version + '.tgz'
  );
};
