var stringifyError = require('./stringify-error');

module.exports = function (app, bundle) {
  //
  // Build statuses
  //
  app.get('/status/:module', status(bundle));
};

function status(bundle) {
  return function (req, res) {
    var t = req.params.module.split('@'),
        module = t.shift(),
        semver,
        subfile = module.split('/');

    if (t.length) {
      semver = t.shift();
    }
    else {
      semver = 'latest';
    }

    if (subfile.length > 1) {
      module = subfile.shift();
      subfile = subfile.join('/');
    }

    bundle.status(module, semver, function (err, sts) {
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
