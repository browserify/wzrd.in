'use strict';

const Promise = require('bluebird');
const request = require('request');
const semver = require('semver');

class Registry {
  static join(module_scope, module_name) {
    if (module_scope) {
      return [ module_scope, module_name ].join('%2F');
    }
    return module_name;
  }

  constructor(config) {
    config = config || {};
    // TODO: Factor this into a config file
    this._url = config.url || process.env.REGISTRY || 'http://registry.npmjs.org/';
    if (this._url.substr(-1) !== '/') {
      this._url += '/';
    }
  }

  metadata(module_scope, module_name) {
    if (!module_name) {
      module_name = module_scope;
      module_scope = '';
    }

    const module_path = this.constructor.join(module_scope, module_name);

    return new Promise((resolve, reject) => {
      request({
        uri: this._url + module_path,
        json: true
      }, function (err, res, body) {
        if (res.statusCode !== 200) {
          if (body.error === 'not_found') {
            err = new Error(`module \`${module_path}\` is not on npm.`);
          }
          else {
            err = new Error(`npm registry returned status code ${res.statusCode}`);
          }
        }

        if (err) {
          err.body = body;
          return reject(err);
        }

        resolve(body);
      });
    });
  }

  resolve(module_scope, module_name, module_semver) {
    return this.versions(module_scope, module_name, module_semver).then((vs) => vs[0]);
  }

  versions(module_scope, module_name, module_semver) {
    if (!module_semver) {
      module_semver = module_name;
      module_name = module_scope;
      module_scope = '';
    }

    return this.metadata(module_scope, module_name).then((data) => {
      let v;

      try {
        if (module_semver === 'latest') {
          v = [data['dist-tags'].latest];
        }
        else if (!semver.validRange(module_semver)) {
          log.warn(`not a valid range: \`${module_semver}\``);

          v = Object.keys(data.versions)
            .filter((v) => v === module_semver)
          ;
        }
        else {
          v = Object.keys(data.versions)
            .filter((v) => semver.satisfies(v, module_semver))
            .sort((a, b) => semver.lte(a, b))
          ;
        }
      }
      catch (e) {
        v = null;
      }

      if (!v) {
        const e = new Error('No match for semver `' + version + '` found');
        e.versions = Object.keys(data.versions);
        throw e;
      }

      return v;
    });
  }
}

module.exports = Registry;

