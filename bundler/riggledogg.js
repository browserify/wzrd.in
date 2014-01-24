var path = require('path');

//
// Riggledogg the package.json to avoid non-installing-from-npm build steps
//
module.exports = function riggledogg(env, module, cb) {

  var package, output;

  readPkg(function () {
    attachReadme(function () {
      blitzScripts();
      writePkg(function () {
        moveFolder()
      });
    });
  });

  function readPkg(next) {
    env.log.info('riggledogg: reading `package.json...`');

    env.fs.readFile('package/package.json', function (err, input) {
      if (err) {
        return cb(err);
      }

      env.log.info('riggledogg: read `package.json`.');

      try {
        package = JSON.parse(input.toString());
      }
      catch (err) {
        return cb(err);
      }
      next();
    });
  }

  function attachReadme(next) {

    env.log.info('riggledogg: attach readme');
    //
    // thx isaac
    //
    env.glob('README?(.*)', { cwd: 'package/', nocase: true, mark: true }, function (err, files) {
      if (err) return cb(err);

      files = files.filter(function (f) { return !f.match(/\/$/); });

      if (!files.length) {
        return next();
      }

      var p = path.join('package/', files[0]);
      env.fs.readFile(p, function (err, readme) {
        if (err) return cb();
        package.readme = readme.toString();
        package.readmeFilename = p;

        next();
      });
    });
  }

  function blitzScripts() {
    //
    // Relatively naive. May be less blitz-ish later.
    //
    package.scripts = {};
  }

  function writePkg(next) {
    output = JSON.stringify(package, true, 2);

    env.log.info('riggledogg: writing `package.json`...');

    env.fs.writeFile('package/package.json', output, function (err) {
      if (err) {
        return cb(err);
      }
      next();
    });
  }

  function moveFolder() {
    env.log.info('riggledogg: making node_modules folder...');

    env.mkdirp('node_modules', function (err) {
      if (err) {
        return cb(err);
      }

      env.log.info('riggledogg: renaming package folder...');

      env.fs.rename('package', 'node_modules/' + module, function (err) {
        if (err) return cb(err);
        cb(null, package);
      });
    });
  }
};

