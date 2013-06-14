var path = require('path');


//
// Riggledogg the package.json to avoid non-installing-from-npm build steps
//
module.exports = function riggledogg(env, module, cb) {

  env.log.info('riggledogg: reading `package.json...`');

  env.fs.readFile('package/package.json', function (err, input) {
    if (err) {
      return cb(err);
    }

    env.log.info('riggledogg: read `package.json`.');

    var package, output;

    try {
      package = JSON.parse(input.toString());
    }
    catch (err) {
      return cb(err);
    }

    //
    // Relatively naive. May be less blitz-ish later.
    //
    package.scripts = {};

    output = JSON.stringify(package, true, 2);

    env.log.info('riggledogg: writing `package.json`...');

    env.fs.writeFile('package/package.json', output, function (err) {
      if (err) {
        return cb(err);
      }

      env.log.info('riggledogg: making node_modules folder...');

      env.mkdirp('node_modules', function (err) {
        if (err) {
          return cb(err);
        }

        env.log.info('riggledogg: renaming package folder...');

        env.fs.rename('package', 'node_modules/' + module, cb);
      });
    });
  });
};
