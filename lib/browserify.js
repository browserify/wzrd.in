var gatherOutputs = require('./gather-outputs');

//
// Run browserify
//
module.exports = function (env, options, cb) {

  var argv = [],
      file;

  if (options.standalone) {
    env.exec('node -pe "require.resolve(\'' + options.module + '\')"', function (err, stdout, stderr) {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return cb(err);
      }

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

    var bfy = env.spawn('browserify', argv);

    gatherOutputs('browserify', bfy, function (err, data) {
      if (err) {
        return cb(err);
      }

      cb(null, data.stdout);
    });
  }
};
