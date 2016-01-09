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

//
// Define the registry that will be used for installing npm packages
//
var registryURL = process.env.REGISTRY || 'http://registry.npmjs.org/';
if (registryURL.substr(-1) !== '/') {
  registryURL += '/';
}
registry.registryURL = registryURL;

registry.metadata = function metadata(module, cb) {
  request({
    uri: registryURL + module,
    json: true
  }, function (err, res, body) {
    if (res.statusCode !== 200) {
      if (body.error === 'not_found') {
        err = new Error('module `' + module + '` is not on npm.');
      }
      else {
        err = new Error('npm registry returned status code ' + res.statusCode);
      }
    }

    if (err) {
      err.body = body;
    }

    cb(err, body);
  });
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
  
  if (module[0] === "@") {
    var matches = module.match(/^@([^/]+)%2F(.+)/);
    var scope = matches[1];
    var name = matches[2];

    return request(
      registryURL +
      '@' + scope + '/' + name + '/-/' +
      name + '-' + version + '.tgz'
    );
  } else {
    return request(
      registryURL +
      module + '/-/' +
      module + '-' + version + '.tgz'
    );
  }
};
