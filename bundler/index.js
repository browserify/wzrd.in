var path = require('path'),
    EventEmitter = require('events').EventEmitter;

var log = require('minilog')('bundler'),
    xtend = require('xtend');

var cache = require('./cache'),
    core = require('./node-core'),
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

  //
  // Used to handle the case where a build is already in-progress
  //
  var inProgress = {};

  var _bundle = function bundle(pkg, callback) {

    var module = pkg.module,
        semver = pkg.version;


    if (core.test(module)) {
      return checkBundles(null, process.version);
    }

    alias(module, semver, checkBundles);

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
          subfile = pkg.subfile,
          key = [module, version, subfile].join('::');

      if (inProgress[key]) {
        inProgress[key].once('bundle', handleBundleEvent);
        inProgress[key].once('error', handleErrorEvent);
        return;
      }

      function handleBundleEvent(res) {
        cb(null, res);
        inProgress[key].removeListener('error', handleErrorEvent);
        cleanupInProgress();
      }

      function handleErrorEvent(err) {
        cb(err);
        inProgress[key].removeListener('bundle', handleBundleEvent);
        cleanupInProgress();
      }

      function cleanupInProgress() {
        if (!(
          inProgress[key].listeners('error').length +
          inProgress[key].listeners('bundle').length
        )) {
          destroyInProgress();
        }
      }

      function destroyInProgress() {
        inProgress[key] = undefined;
      }

      //
      // Set up the EE
      //
      inProgress[key] = new EventEmitter;

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
          if (err) return handleError(err);

          riggledogg(env, module, function (err, json) {
            if (err) return handleError(err);

            install(env, module, function (err) {
              if (err) return handleError(err);

              browserify(env, pkg, function (err, bundle) {
                if (err) return handleError(err);
                return finish(err, bundle, json);
              });
            });
          });
        });
        function finish(err, bundle, json) {
          if (err) return handleError(err);

          log.info('bundler: successfully browserified `' + module + '@' + version + '`.');

          var result = { package: json, bundle: bundle };

          // Save build metadata to c.builds
          c.statuses.put(pkg, { module: module, version: version, ok: true });

          inProgress[key].emit('bundle', result);
          destroyInProgress();

          cb(null, result);
          env.teardown();
        }

        function handleError(err) {
          err = withPath(err);

          inProgress[key].emit('error', err);
          destroyInProgress();

          c.statuses.db.put(pkg, {
            module: module,
            version: version,
            ok: false,
            error: xtend(
              {
                message: err.message,
                stack: err.stack
              },
              err
            )
          });

          return cb(err);
        }

        function withPath(err) {
          err.dirPath = env.dirPath;
          return err;
        }
      });
    }
  };

  function alias(module, semver, callback) {
    c.aliases.check({ module: module, semver: semver }, function resolve(cb) {
      registry.resolve(module, semver, function (err, v) {
        if (err) return callback(err);

        cb(null, v);
      });
    }, callback);
  }

  _bundle.status = function status(module, semver, callback) {
    registry.resolve(module, semver, function (err, versions) {
      if (err) return callback(err);

      _bundle.builds.get({ module: module, version: version }, callback);
    });
  }

  _bundle.cache = c;
  _bundle.alias = alias;

  return _bundle;
};
