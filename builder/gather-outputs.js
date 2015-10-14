var concat = require('concat-stream');

module.exports = function gatherOutputs(name, child, cb) {
  //
  // Buffer to show the user
  //
  var stdout = '', stderr = '', ct = 0, code;
  child.stdout.pipe(concat(function (_out) {
    if (_out) {
      stdout = _out.toString();
    }
    finish();
  }));
  child.stderr.pipe(concat(function (_err) {
    if (_err) {
      stderr = _err.toString();
    }
    finish();
  }));

  child.on('exit', function (c) {
    code = c;
    finish();
  });

  child.on('error', cb);

  function finish() {
    ct++;
    if (ct >= 3) {
      var err = null;
      if (code) {
        err = new Error(name + ' exited with code ' + code);
        err.code = code;
        err.stdout = stdout;
        err.stderr = stderr;
      }
      return cb(err, { stdout: stdout, stderr: stderr });
    }
  };
};
