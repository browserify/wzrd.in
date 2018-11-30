var stringifyError = require('./stringify-error');

module.exports = function (app, bundle) {
  //
  // Build statuses
  //
  app.get('/status/:module', status(bundle));
};

function status(bundle) {
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

    var subfile = module.split('/');

    if (subfile.length > 1) {
      module = subfile.shift();
      subfile = subfile.join('/');
    }
    
    if (scope) {
      module = scope + '/' + module;
    }
    else {
      module = module;
    }

    bundle.status(module, version, function (err, sts) {
      if (err) {
        return res.json(500, {
          ok: false,
          message: err.message,
          hints: stringifyError.goodbye
        });
      }
      res.json({
        module: module,
        builds: sts
      });
    });
  };
}
