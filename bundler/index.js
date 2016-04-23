var path = require('path'),
    EventEmitter = require('events').EventEmitter;

var log = require('minilog')('bundler'),
    xtend = require('xtend'),
    waitress = require('waitress');

var cache = require('./cache'),
    core = require('./node-core'),
    buildEnv = require('./build-env'),
    registry = require('./registry'),
    unpack = require('./unpack'),
    riggledogg = require('./riggledogg'),
    install = require('./install'),
    browserify = require('./browserify'),
    minify = require('./minify');


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
      
      // to prevent crashes from 'unhandled error' exceptions
      inProgress[key].on('error', function noop() {});

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
                if (pkg.debug) return finish(err, bundle, json);

                finish(err, minify(env, bundle) || bundle, json);
              });
            });
          });
        });
        function finish(err, bundle, json) {
          if (err) return handleError(err);

          log.info('bundler: successfully browserified `' + module + '@' + version + '`.');

          var result = { package: json, bundle: bundle };

          c.statuses.put(pkg, { ok: true });

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

  _bundle.purge = purge;
  function purge(pkg, callback) {
    var module = pkg.module,
        semver = pkg.version;

    if (core.test(module)) {
      return purgeBundles(null, process.version);
    }

    alias(module, semver, purgeBundles);

    function purgeBundles(err, version) {
      if (err) return callback(err);

      log.info('purge: ' + JSON.stringify({ module: module, semver: semver, version: version }));

      var done = waitress(2, callback);

      c.aliases.del({ module: module, semver: semver }, done);

      pkg.version = version;

      delete pkg.purge;

      c.bundles.del(pkg, done);
    }
  }

  _bundle.alias = alias;
  function alias(module, semver, callback) {
    c.aliases.check({ module: module, semver: semver }, function resolve(cb) {
      registry.resolve(module, semver, function (err, v) {
        if (err) return callback(err);

        cb(null, v);
      });
    }, callback);
  }

  _bundle.status = status;
  function status(module, semver, callback) {
    registry.versions(module, semver, function (err, vs) {
      if (err) return callback(err);

      var sts = {},
          finish = waitress(vs.length, function (err) {
            if (err) return callback(err);
            callback(null, sts);
          });

      vs.forEach(function (v) {
        c.statuses.get({ module: module, version: v }, function (err, st) {
          if (err) {
            if (err.name == 'NotFoundError') {
              return finish();
            }
            return finish(err);
          }
          sts[v] = st;
          finish();
        });
      });
    });
  }

  _bundle.cache = c;

  return _bundle;
};
