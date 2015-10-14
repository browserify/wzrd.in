var fs = require('fs');

var glob = require('glob');
var mkdirp = require('mkdirp');

var log = require('./log');

//
// Riggledogg the package.json to avoid non-installing-from-npm build steps
//
module.exports = function riggledogg(module, cb) {

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
    log.info('riggledogg: reading `package.json...`');

    fs.readFile('./package/package.json', function (err, input) {
      if (err) {
        return cb(err);
      }

      log.info('riggledogg: read `package.json`.');

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

    log.info('riggledogg: attach readme');
    //
    // thx isaac
    //
    glob('README?(.*)', { cwd: './package/', nocase: true, mark: true }, function (err, files) {
      if (err) return cb(err);

      files = files.filter(function (f) { return !f.match(/\/$/); });

      if (!files.length) {
        return next();
      }

      var p = path.join('./package/', files[0]);
      fs.readFile(p, function (err, readme) {
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

    log.info('riggledogg: writing `package.json`...');

    fs.writeFile('./package/package.json', output, function (err) {
      if (err) {
        return cb(err);
      }
      next();
    });
  }

  function moveFolder() {
    log.info('riggledogg: making node_modules folder...');

    mkdirp('./node_modules', function (err) {
      if (err) {
        return cb(err);
      }

      log.info('riggledogg: renaming package folder...');

      fs.rename('./package', './node_modules/' + module, function (err) {
        if (err) return cb(err);
        cb(null, package);
      });
    });
  }
};

