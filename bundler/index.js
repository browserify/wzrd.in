'use strict';

const path = require('path');

const log = require('minilog')('bundler');
const Promise = require('bluebird');
const xtend = require('xtend');
const waitress = require('waitress');

const Builder = require('../builder');
const cache = require('./cache');
const core = require('./node-core');
const registry = require('./registry');

class Bundler {
  constructor(opts) {
    opts = opts || {};

    this._db = opts.db;
    this._root = opts.root;
    this._cache = cache(this._db);
    this._builder = new Builder();
  }

  init() {
    return this._builder.init();
  }

  bundle(input) {
    return Promise.try(() => {
      if (core.test(input.module_name)) {
        return process.version;
      }

      return this._getAlias(input.module_name, input.module_semver);
    }).then((module_version) => {
      input.module_version = module_version;

      return this._getBundle(input);
    });
  }

  _getAlias(module, semver) {
    return this._cache.aliases.check({ module: module, semver: semver }, () => {
      return registry.resolve(module, semver)
    });
  }

  _getBundle(input) {
    return this._cache.bundles.check(input, () => {
      return this._build(input);
    });
  }

  _build(input) {
    return Promise.try(() => {
      log.info(`about to browserify \`${input.module_name}@${input.module_version}\`...`);

      return this._builder.build(input).then((output) => {
        log.info(`bundler: successfully browserified \`${output.debug.module_name}@${output.debug.module_version}\`.`);

        this._cache.statuses.put(input, { ok: true });

        return {
          'package': output.pkg,
          bundle: output.bundle
        };
      }).catch((err) => {
        err = withPath(err);

        this._cache.statuses.db.put(pkg, {
          ok: false,
          error: Object.assign(
            {
              message: err.message,
              stack: err.stack
            },
            err
          )
        });

        throw err;
      }

      function withPath(err) {
        err.dirPath = env.dirPath;
        return err;
      }
    });
  }

  purge(input) {
    return Promise.try(() => {
      if (core.test(input.module_name)) {
        return purgeBundles(null, process.version);
      }

      return this._getAlias(module, semver).then(purgeBundles);
    });

    function purgeBundles(version) {
      log.info(`purge: ${JSON.stringify(input)}`);

      var done = waitress(2, callback);

      this._cache.aliases.del({ module: module, semver: semver }, done);

      delete pkg.purge;

      this._cache.bundles.del(pkg, done);
    }
  }

  status(module, semver) {
    return registry.versions(module, semver).then((versions) => {
      const states = {};

      return Promise.all(vs.map((version) => {
        return this._cache.statuses.get({ module: module, version: version });
      })).catch((err) => {
        if (err.name === 'NotFoundError') {
          return null;
        }
        throw err;
      }).then((sts) => {
        sts.forEach((st, i) => {
          states[versions[i]] = st;
        });

        return states;
      });
    });
  }
};

module.exports = function createBundler(opts) {
  return new Bundler(opts);
};
