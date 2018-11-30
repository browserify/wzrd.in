var stringifyError = require('./stringify-error');

module.exports = function (app, bundle) {
  //
  // Singular bundles
  //
  app.get('/bundle/:module', singular(bundle));
  app.purge('/bundle/:module', singular(bundle, { purge: true }));
  app.get('/debug-bundle/:module', singular(bundle, { debug: true }));
  app.purge('/debug-bundle/:module', singular(bundle, { debug: true, purge: true }));
  app.get('/standalone/:module', singular(bundle, { standalone: true }));
  app.purge('/standalone/:module', singular(bundle, { standalone: true, purge: true }));
  app.get('/debug-standalone/:module', singular(bundle, { standalone: true, debug: true }));
  app.purge('/debug-standalone/:module', singular(bundle, { standalone: true, debug: true, purge: true }));
};

function singular(bundle, opts) {
  opts = opts || {};

  return function (req, res) {
    var scope,
        version = 'latest',
        module = req.params.module,
        matches = module.match(/^(@[^/]+)?(\/)?([^@]+)@?(.+)?/);

    if (matches) {
      scope = matches[1];
      module = matches[3] ? matches[3] : module;
      version = matches[4] ? matches[4] : version;
    }

    var subfile = module.split('/'),
        o = JSON.parse(JSON.stringify(opts));

    if (subfile.length > 1) {
      module = subfile.shift();
      subfile = subfile.join('/');
      o.subfile = subfile;
    }

    if (scope) {
      o.module = scope + '/' + module;
    }
    else {
      o.module = module;
    }
    o.version = version;

    var serve = serveBundle(res);

    if (o.purge) {
      return bundle.purge(o, function(err) {
        if (err) {
          return fiveHundred(res, err);
        }

        res.setHeader('content-type', 'text/plain');
        res.end('PURGE IS PURGED\n');
      });
    }

    bundle(o, serveBundle(res));
  };
}

function fourOhFour(res, err) {
  res.setHeader('content-type', 'text/plain');
  res.statusCode = 404;
  res.write('That package does not exist. Please check that its name is spelled correctly!\n\n');
  return res.end(err.message);
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
      if (err.notFound) {
        return fourOhFour(res, err);
      }
      return fiveHundred(res, err);
    }
    res.setHeader('content-type', 'text/javascript');
    res.end(bundle.bundle);
  };
}
