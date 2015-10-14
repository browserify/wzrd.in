var exec = require('child_process').exec,
    path = require('path');

var gatherOutputs = require('./gather-outputs'),
    log = require('./log');

//
// Run browserify
//
module.exports = function (options, cb) {

  var argv = [],
      file,
      module = options.module,
      moduleFolder = module;

  if (options.subfile) {
    module += '/' + options.subfile;
  }

  if (options.standalone && !options.__core__) {

    log.info('browserify: resolving path to standalone module `' + module + '`...');

    exec('node -pe "require.resolve(\'' + module + '\')"', function (err, stdout, stderr) {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return cb(err);
      }

      log.info('browserify: successfully resolved path to standalone module `' + module + '`.');

      file = stdout.replace(/\n$/, '');
      run();
    });
  }
  else {
    run();
  }

  function run() {
    if (options.debug) {
      argv.push('--debug');
    }

    if (options.standalone) {
      argv.push('--standalone');
      argv.push(module);
      if (file) argv.push(file);
    }
    if (!options.standalone || options.__core__) {
      argv.push('-r');
      argv.push(module);
    }

    log.info('browserify: running browserify with options: `' + JSON.stringify(argv) + '`...');

    var cwdPath = path.join('node_modules', moduleFolder);
    var bfy;
    fs.exists(cwdPath, function (exists) {
      var opt;
      if (exists) {
        opt = {
          cwd: path.join('node_modules', moduleFolder)
        };
      }
      var bfy = spawn('browserify', argv, opt);
      gatherOutputs('browserify', bfy, function (err, data) {
        if (err) {
          delete err.stdout;
          return cb(err);
        }

        log.info('browserify: browserification complete.');

        data.stderr.split('\n').forEach(function (l) {
          log.info('browserify: stderr - ' + l);
        });

        cb(null, data.stdout);
      });
    });

  }
};
