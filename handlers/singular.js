'use strict';

const parse = require('../lib/parse');
const stringifyError = require('../stringify-error');

module.exports = function createSingularHandler(bundler, options) {
  options = options || {};

  return function singularHandler(req, res) {
    const serve = serveBundle(res);
    const fail = fiveHundred(res);
    const ack = acknowledgePurge(res);

    let input;
    try {
      input = parse(req.params.slug, options);
    }
    catch (err) {
      return fail(err);
    }

    // TODO: Separate handler
    if (options.purge) {
      return bundler.purge(o).then(ack, fail).done();
    }

    bundler.bundle(input).then(serve, fail).done();
  };
};

// TODO: Dedicated views?
function fiveHundred(res) {
  return function(err) {
    res.setHeader('content-type', 'text/plain');
    res.statusCode = 500;
    res.write(stringifyError.hello);
    res.write(stringifyError(err));
    return res.end(stringifyError.goodbye);
  };
}

function acknowledgePurge(res) {
  return function() {
    res.setHeader('content-type', 'text/plain');
    res.end('PURGE IS PURGED\n');
  };
}

function serveBundle(res) {
  return function(bundle) {
    res.setHeader('content-type', 'text/javascript');
    res.end(bundle.bundle);
  };
}
