var log = require('minilog')('registry'),
    request = require('request'),
    semver = require('semver'),
    npm = require('npm');

var npmRegistry;

//
// Find tarballs on npm
//
var registry = module.exports = function get(module, version, cb) {
  console.log('*** registry.get');
  log.info('getting npm registry');
  registry.resolve(module, version, function (err, v) {
    if (err) return cb(err);

    return cb(null, registry.download(module, v));
  });
};

registry.metadata = function metadata(module, cb) {
  console.log('metadata: npmRegistry = ' + npmRegistry);
  request({
    uri: npmRegistry + module,
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
  npm.load({}, function() {
    npmRegistry = npm.config.get('registry');
    
    registry.versions(module, version, function (err, vs) {
      if (err) return cb(err);
      cb(null, vs[0]);
    });
  });

};

registry.versions = function versions(module, version, cb) {
  console.log('*** registry.versions');
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
  return request(
    npmRegistry +
    module + '/-/' +
    module + '-' + version + '.tgz'
  );
};
