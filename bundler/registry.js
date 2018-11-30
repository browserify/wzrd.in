var pacote = require('pacote'),
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

//
// Define the registry that will be used for installing npm packages
//
var registryURL = process.env.REGISTRY || 'http://registry.npmjs.org/';
if (registryURL.substr(-1) !== '/') {
  registryURL += '/';
}
registry.registryURL = registryURL;

registry.metadata = function metadata(module, cb) {
  return pacote.packument(module)
    .catch(function (err) {
      var newErr = new Error('npm registry returned: ' + err.message);
      if (err.statusCode === 404) {
        err.notFound = true;
      }
      throw err;
    })
    .then(
      function (body) { cb(null, body); },
      function (err) { cb(err); }
    );
};

registry.resolve = function resolve(module, version, cb) {
  registry.versions(module, version, function (err, vs) {
    if (err) return cb(err);
    cb(null, vs[0]);
  });
};

registry.versions = function versions(module, version, cb) {
  registry.metadata(module, function (err, data) {
    if (err) {
      return cb(err);
    }

    var v;

    try {
      if (version === 'latest') {
        v = [data['dist-tags'].latest];
      }
      else if (!semver.validRange(version)) {
        console.log('not a valid range ' + version);

        v = Object.keys(data.versions)
          .filter(function (v) {
            return v === version;
          })
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
        ;
      }
    }
    catch (e) {
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
  return pacote.tarball.stream(module + '@' + version);
};
