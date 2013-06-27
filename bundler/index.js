var path = require('path');

var log = require('minilog')('bundler');

var cache = require('./cache'),
    buildEnv = require('./build-env'),
    registry = require('./registry'),
    unpack = require('./unpack'),
    riggledogg = require('./riggledogg'),
    install = require('./install'),
    browserify = require('./browserify');


module.exports = function bundler(opts) {
  opts = opts || {};

  var db = opts.db,
      root = opts.root;

  var c = cache(db);

  var _bundle = function bundle(pkg, callback) {

    var module = pkg.module,
        semver = pkg.version;

    c.aliases({ module: module, semver: semver }, function resolve(cb) {
      registry.resolve(module, semver, function (err, v) {
        if (err) return callback(err);

        cb(null, v);
      });
    }, checkBundles);

    function checkBundles(err, version) {
      if (err) return callback(err);

      pkg.version = version;

      c.bundles(pkg, function (cb) {
        return build(pkg, cb);
      }, callback);
    }

    function build(pkg, cb) {
      var module = pkg.module,
          version = pkg.version;

      log.info('about to browserify `' + module + '@' + version + '`...');

      buildEnv({
        root: module
      }, function (err, env) {
        if (err) return cb(withPath(err));

        unpack(env, registry.download(module, version), function (err) {
          if (err) return cb(withPath(err));

          riggledogg(env, module, function (err) {
            if (err) return cb(withPath(err));

            install(env, module, function (err) {
              if (err) return cb(withPath(err));

              browserify(env, pkg, function (err, bundle) {
                if (err) return cb(withPath(err));

                log.info('bundler: successfully browserified `' + module + '@' + semver + '`.');

                cb(null, bundle);

                env.teardown();
              });
            });
          });
        });
        function withPath(err) {
          err.dirPath = env.dirPath;
          return err;
        }
      });
    }
  };

  _bundle.cache = c;
  _bundle.db = c.db;

  return _bundle;
};
