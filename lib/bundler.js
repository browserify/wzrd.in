'use strict';

const assert = require('assert');
const path = require('path');

const _ = require('lodash');
const log = require('minilog')('bundler');
const Promise = require('bluebird');
const waitress = require('waitress');

const Builder = require('../builder');
const cache = require('./cache');
const core = require('./node-core');
const Registry = require('./registry');
const validate = require('./validate');

class Bundler {
  constructor(config) {
    config = config || {};

    this.config = config;
    this._caches = cache.createCaches(config);
    this._registry = new Registry(_.get(config, 'npm.registry'));
    this._builder = new Builder(_.get(config, 'builder'));
  }

  init() {
    return this._builder.init();
  }

  bundle(input) {
    return Promise.try(() => {
      input = validate.validateInput(input);
      return this._getAlias(input);
    }).then((module_version) => {
      
      assert(module_version, 'Must have a module_version');
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
      return this._registry.resolve(input.module_scope, input.module_name, input.module_semver);
    });
  }

  _getBundle(input) {
    return this._caches.bundles.check(input, () => {
      return this._build(input);
    });
  }

  _recordBuildStatus(input, promiseBuild) {
    return promiseBuild
      .then((output) => {
        log.info(`bundler: successfully browserified \`${output.debug.module_name}@${output.debug.module_version}\`.`);

        return this._caches.statuses.put(input, { ok: true });
      }, (err) => { 
        return this._caches.statuses.put(input, {
          ok: false,
          error: Object.assign(
            {
              message: err.message,
              stack: err.stack
            },
            err
          )
        });
      })
    ;
  }

  _build(input) {
    return Promise.try(() => {
      log.info(`about to browserify \`${input.module_name}@${input.module_version}\`...`);

      const build = this._builder.build(input);
      this._recordBuildStatus(input, build).catch((err) => log.error(err)).done();
      return build;
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

    return this._registry.versions(module_scope, module_name, module_semver)
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
