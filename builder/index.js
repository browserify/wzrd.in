var log = require('./log'),
    core = require('./node-core'),
    registry = require('./registry'),
    unpack = require('./unpack'),
    riggledogg = require('./riggledogg'),
    install = require('./install'),
    browserify = require('./browserify');

module.exports = function bundle(pkg, callback) {

  var module = pkg.module,
      version = pkg.version,
      subfile = pkg.subfile;

  log.info('about to browserify `' + module + '@' + version + '`...');

  if (core.test(module)) {
    pkg.__core__ = true;
    return browserify(pkg, function (err, bundle) {
      return finish(err, bundle, { core: true, version: pkg.version });
    });
  }

  unpack(registry.download(module, version), function (err) {
    if (err) return handleError(err);

    riggledogg(module, function (err, json) {
      if (err) return handleError(err);

      install(module, function (err) {
        if (err) return handleError(err);

        browserify(pkg, function (err, bundle) {
          return finish(err, bundle, json);
        });
      });
    });
  });

  function finish(err, bundle, json) {
    if (err) return handleError(err);

    log.info('bundler: successfully browserified `' + module + '@' + version + '`.');

    var result = { package: json, bundle: bundle };

    cb(null, result);
  }

  function handleError(err) {
    return cb(err);
  }
};
