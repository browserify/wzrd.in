var path = require('path');

var log = require('minilog')('bundler');

var cache = require('./cache'),
    core = require('./node-core'),
    buildEnv = require('./build-env'),
    registry = require('./registry'),
    unpack = require('./unpack'),
    riggledogg = require('./riggledogg'),
    install = require('./install'),
    browserify = require('./browserify'),
    stringifyError = require('../stringify-error');

module.exports = function bundler(opts) {
  opts = opts || {};

  var db = opts.db,
      root = opts.root;

  var c = cache(db);

  var _bundle = function bundle(pkg, callback) {

    var module = pkg.module,
        semver = pkg.version;

    if (core.test(module)) {
      return checkBundles(null, process.version);
    }

    c.aliases.check({ module: module, semver: semver }, function resolve(cb) {
      registry.resolve(module, semver, function (err, v) {
        if (err) return callback(err);

        cb(null, v);
      });
    }, checkBundles);

    function checkBundles(err, version) {
      if (err) return callback(err);

      pkg.version = version;

      c.bundles.check(pkg, function (cb) {
        return build(pkg, cb);
      }, callback);
    }

    function build(pkg, cb) {
      var module = pkg.module,
          version = pkg.version,
          subfile = pkg.subfile;

      log.info('about to browserify `' + module + '@' + version + '`...');

      buildEnv({
        root: module
      }, function (err, env) {
        if (err) return cb(withPath(err));

        if (core.test(module)) {
          pkg.__core__ = true;
          return browserify(env, pkg, function (err, bundle) {
            return finish(err, bundle, { core: true, version: pkg.version });
          });
        }

        unpack(env, registry.download(module, version), function (err) {
          if (err) return cb(withPath(err));

          riggledogg(env, module, function (err, json) {
            if (err) return cb(withPath(err));

            install(env, module, function (err) {
              if (err) return cb(withPath(err));

              browserify(env, pkg, function (err, bundle) {
                return finish(err, bundle, json);
              });
            });
          });
        });
        function finish(err, bundle, json) {
          var bundleID = module + '@' + version;
          if (err) {
            return c.buildstatuses.put(bundleID, {
              ok: false,
              error: err.message,
              errorDetails: stringifyError(err)
            }, function(){
              cb(withPath(err));
            });
          }
          
          log.info('bundler: successfully browserified `' + module + '@' + semver + '`.');

          c.buildstatuses.put(bundleID, {
            ok: true
          }, function(){
            cb(null, { package: json, bundle: bundle });
            env.teardown();
          });
        }
        function withPath(err) {
          err.dirPath = env.dirPath;
          return err;
        }
      });
    }
  };

  _bundle.cache = c;

  return _bundle;
};
