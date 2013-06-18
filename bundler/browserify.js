var gatherOutputs = require('./gather-outputs');

//
// Run browserify
//
module.exports = function (env, options, cb) {

  var argv = [],
      file;

  if (options.standalone) {

    env.log.info('browserify: resolving path to standalone module `' + options.module + '`...');

    env.exec('node -pe "require.resolve(\'' + options.module + '\')"', function (err, stdout, stderr) {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return cb(err);
      }

      env.log.info('browserify: successfully resolved path to standalone module `' + options.module + '`.');

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
      argv.push(options.module);
      argv.push(file);
    }
    else {
      argv.push('-r');
      argv.push(options.module);
    }

    env.log.info('browserify: running browserify with options: `' + JSON.stringify(argv) + '`...');
    var bfy = env.spawn('browserify', argv);

    gatherOutputs('browserify', bfy, function (err, data) {
      if (err) {
        return cb(err);
      }

      env.log.info('browserify: browserification complete.');

      data.stderr.split('\n').forEach(function (l) {
        env.log.info('browserify: stderr - ' + l);
      });

      cb(null, data.stdout);
    });
  }
};
