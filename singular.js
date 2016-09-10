var stringifyError = require('./stringify-error');

module.exports = function (app, bundler) {
  //
  // Singular bundles
  //
  app.get('/bundle/:module', singular(bundler));
  app.purge('/bundle/:module', singular(bundler, { purge: true }));
  app.get('/debug-bundle/:module', singular(bundler, { debug: true }));
  app.purge('/debug-bundle/:module', singular(bundler, { debug: true, purge: true }));
  app.get('/standalone/:module', singular(bundler, { standalone: true }));
  app.purge('/standalone/:module', singular(bundler, { standalone: true, purge: true }));
  app.get('/debug-standalone/:module', singular(bundler, { standalone: true, debug: true }));
  app.purge('/debug-standalone/:module', singular(bundler, { standalone: true, debug: true, purge: true }));
};

function singular(bundler, routeOpts) {
  routeOpts = routeOpts || {};

  return function (req, res) {
    const input = {
      module_semver: 'latest',
      debug: routeOpts.debug,
      standalone: routeOpts.standalone
    };

    const params = req.params.module;
    const matches = params.match(/^(@[^/]+)?(\/)?([^@]+)@?(.+)?/);

    if (matches) {
      input.module_scope = matches[1];
      input.module_name = matches[3] ? matches[3] : params;
      input.module_semver = matches[4] ? matches[4] : input.module_semver;
    }

    const subfile = input.module_name.split('/');

    if (subfile.length > 1) {
      input.module_name = subfile.shift();
      input.module_subfile = subfile.join('/');
    }

    var serve = serveBundle(res);

    if (routeOpts.purge) {
      return bundle.purge(o, function(err) {
        if (err) {
          return fiveHundred(res, err);
        }

        res.setHeader('content-type', 'text/plain');
        res.end('PURGE IS PURGED\n');
      });
    }

    bundle(input, serveBundle(res));
  };
}

function fiveHundred(res, err) {
  res.setHeader('content-type', 'text/plain');
  res.statusCode = 500;
  res.write(stringifyError.hello);
  res.write(stringifyError(err));
  return res.end(stringifyError.goodbye);
}

function serveBundle(res) {
  return function (err, bundle) {
    if (err) {
      return fiveHundred(res, err);
    }
    res.setHeader('content-type', 'text/javascript');
    res.end(bundle.bundle);
  };
}
