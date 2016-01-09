var stringifyError = require('./stringify-error');

module.exports = function (app, bundle) {
  //
  // Singular bundles
  //
  app.get('/bundle/:scope?/:module', singular(bundle));
  app.get('/debug-bundle/:scope?/:module', singular(bundle, { debug: true }));
  app.get('/standalone/:scope?/:module', singular(bundle, { standalone: true }));
  app.get('/debug-standalone/:scope?/:module', singular(bundle, { standalone: true, debug: true }));
};

function singular(bundle, opts) {
  opts = opts || {};

  return function (req, res) {
    var t = req.params.module.split('@'),
        module = t.shift(),
        version,
        scope = req.params.scope,
        subfile = module.split('/');

    var o = JSON.parse(JSON.stringify(opts));

    if (t.length) {
      version = t.shift();
    }
    else {
      version = 'latest';
    }

    if (subfile.length > 1) {
      module = subfile.shift();
      subfile = subfile.join('/');
      o.subfile = subfile;
    }

    if (scope) {
      o.module = scope + '%2F' + module;
    }
    else {
      o.module = module;
    }
    o.version = version;

    bundle(o, serveBundle(res));
  };
}

function serveBundle(res) {
  return function (err, bundle) {
    if (err) {
      res.setHeader('content-type', 'text/plain');
      res.statusCode = 500;
      res.write(stringifyError.hello);
      res.write(stringifyError(err));
      return res.end(stringifyError.goodbye);
    }
    res.setHeader('content-type', 'text/javascript');
    res.end(bundle.bundle);
  };
}
