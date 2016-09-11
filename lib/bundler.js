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
    this._caches = cache.createCaches(this._db);
    this._builder = new Builder();
  }

  init() {
    return this._builder.init();
  }

  bundle(input) {
    return Promise.try(() => {
      return this._getAlias(input.module_name, input.module_semver);
    }).then((module_version) => {
      input.module_version = module_version;

      return this._getBundle(input);
    });
  }

  _getAlias(input) {
    // Special case for core modules
    // TODO: Throw if builder node version doesn't match?
    if (core.test(input.module_name)) {
      // TODO: This should be cleaned up at the builder level
      return Promise.resolve(this._builder.versions.node.replace(/^v/, ''));
    }

    return this._caches.aliases.check(input, () => {
      return registry.resolve(input.module_scope, input.module_name, input.module_semver);
    });
  }

  _getBundle(input) {
    return this._caches.bundles.check(input, () => {
      return this._build(input);
    });
  }

  _recordBuildStatus(promiseBuild) {
    promiseBuild
      .catch((err) => {
         this._caches.statuses.db.put(pkg, {
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
      })
      .then((output) => {
        log.info(`bundler: successfully browserified \`${output.debug.module_name}@${output.debug.module_version}\`.`);

        this._caches.statuses.put(input, { ok: true }).then(() => {
          return {
            package: output.pkg,
            bundle: output.bundle
          };
        });
      })
    ;

    return promiseBuild;
  }

  _build(input) {
    return Promise.try(() => {
      log.info(`about to browserify \`${input.module_name}@${input.module_version}\`...`);

      return this._recordBuildStatus(this._builder.build(input));
    });
  }

  purge(input) {
    const module_scope = input.module_scope;
    const module_name = input.module_name;
    const module_semver = input.module_semver;

    return Promise.try(() => {
      return this._getAlias(module_name, module_semver);
    }).then((node_version) => {
      log.info(`purge: ${JSON.stringify(input)}`);
      return Promise.all([
        this._caches.aliases.del({
          module_scope: module_scope,
          module_name: module_name,
          module_semver: module_semver
        }),
        this._caches.bundles.del(input)
      ]);
    });
  }

  status(input) {
    const module_scope = input.module_scope;
    const module_name = input.module_name;
    const module_semver = input.module_semver;

    return registry.versions(module_scope, module_name, module_semver)
      .then((versions) => {
        const states = {};

        return Promise.all(vs.map((module_version) => {
          return this._caches.statuses.get({
            module_scope: module_scope,
            module_name: module_name,
            module_version: module_version
          }).catch((err) => {
            if (err.name === 'NotFoundError') {
              return null;
            }
          });
        })).then((sts) => {
          sts.forEach((st, i) => {
            states[versions[i]] = st;
          });

          return states;
        })
      ;
    });
  }
};

module.exports = Bundler;
