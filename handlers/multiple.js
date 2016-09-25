'use strict';

const Promise = require('bluebird');
const parse = require('../lib/parse');

const cache = require('../lib/cache');
const stringifyError = require('../stringify-error');

exports.create = function create(bundler) {

  const caches = bundler._caches;

  return function (req, res) {
    const opts = req.body;

    const deps = opts.dependencies;
    const options = opts.options || {};

    if (typeof deps === 'undefined' || deps === null) {
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain');
      res.write(stringifyError.hello);
      res.write(stringifyError(new Error(
        'Multibundles *must* have specified dependencies.\n' +
        'Otherwise this exercise is pretty much pointless.'
      )));
      return res.end(stringifyError.goodbye);
    }

    caches.multibundles.check(opts, () => {
      const keys = Object.keys(deps);
      const count = keys.length;
      const modules = {};
      const errors = [];

      return Promise.all(keys.map((k) => {
        const input = Object.assign(parse(k), options, { module_semver: deps[k] });

        process.stderr.write('input: ' + JSON.stringify(input) + '\n');

        return bundler.bundle(input).then((b) => {
          process.stderr.write('adding ' + k + ' to modules\n');
          modules[k] = b;
        }, (err) => {
          errors.push(err);
        });
      })).then(() => {
        if (errors.length) {
          let msg = 'Errors while generating multibundle:\n';

          errors.forEach((err, i) => {
            msg += '--- error #' + i + ': ---\n\n';
            msg += stringifyError(err) + '\n';
          });

          msg += '\n------\n';

          const err = new Error(msg);

          throw err;
        }

        process.stderr.write('module keys:' + JSON.stringify(Object.keys(modules)) + '\n');
        return JSON.stringify(modules, null, 2); 
      });
    }).then((b) => {
      //
      // It seems 302s cause problems with certain use cases.
      // I still include the Location header here though, so that one may
      // pull it out programmatically if they wish.
      //
      // res.statusCode = 302;
      res.setHeader('Location', '/multi/' + encodeURIComponent(cache.defaultHashFxn(opts)));
      res.setHeader('content-type', 'application/json');
      res.end(b);
    }, (err) => {
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain');
      res.write(stringifyError.hello);
      res.write(stringifyError(err));
      return res.end(stringifyError.goodbye);
    });
  };
};

exports.purge = function purge (bundler) {
  const caches = bundler._caches;

  return function (req, res) {
    const hash = req.params.bundle;

    caches.multibundles.del(decodeURIComponent(hash)).then(() => {
      res.end('PURGE IS PURGED\n');
    }, (err) => {
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain');
      res.write(stringifyError.hello);
      res.write(stringifyError(err));
      res.end(stringifyError.goodbye);
    });
  };
}

exports.get = function get(bundler) {

  const caches = bundler._caches;

  return function (req, res) {

    const hash = req.params.bundle;

    caches.multibundles._get(decodeURIComponent(hash)).then((bundle) => {
      res.setHeader('content-type', 'application/json');
      res.end(bundle);
    }, (err) => {
      if (err.name === 'NotFoundError') {
        res.statusCode = 404;
        res.setHeader('content-type', 'text/plain');
        res.write(stringifyError.hello);
        res.write(stringifyError(new Error(
          'The requested bundle does not exist.\n' +
          'Have you tried POSTING to `/multi`?'
        )));
        return res.end(stringifyError.goodbye);
      }

      //
      // This should not happen.
      //
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain');
      res.write(stringifyError.hello);
      res.write(stringifyError(err));
      return res.end(stringifyError.goodbye);
    });
  };
};
