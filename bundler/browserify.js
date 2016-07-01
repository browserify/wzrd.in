var gatherOutputs = require('./gather-outputs');
var path = require('path');

//
// Run browserify
//
module.exports = function (env, options, cb) {

  var argv = [],
      file,
      module = options.module,
      moduleFolder = module;

  if (options.subfile) {
    module += '/' + options.subfile;
  }

  if (options.standalone && !options.__core__) {

    env.log.info('browserify: resolving path to standalone module `' + module + '`...');

    env.exec('node -pe "require.resolve(\'' + module + '\')"', function (err, stdout, stderr) {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return cb(err);
      }

      env.log.info('browserify: successfully resolved path to standalone module `' + module + '`.');

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
    if (options.fullPaths) {
      argv.push('--full-paths');
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

    env.log.info('browserify: running browserify with options: `' + JSON.stringify(argv) + '`...');

    var cwdPath = path.join('node_modules', moduleFolder);
    var bfy;
    env.fs.exists(cwdPath, function (exists) {
      var opt;
      if (exists) {
        opt = {
          cwd: path.join('node_modules', moduleFolder)
        };
      }
      var bfy = env.spawn('browserify', argv, opt);
      gatherOutputs('browserify', bfy, function (err, data) {
        if (err) {
          delete err.stdout;
          return cb(err);
        }

        env.log.info('browserify: browserification complete.');

        data.stderr.split('\n').forEach(function (l) {
          env.log.info('browserify: stderr - ' + l);
        });

        cb(null, data.stdout);
      });
    });

  }
};
