var spawn = require('child_process').spawn;

var gatherOutputs = require('./gather-outputs'),
    log = require('./log');

//
// Run npm install
//
module.exports = function install(module, cb) {
  var npm;

  log.info('install: installing `' + module + '`...');

  npm = spawn('npm', [ 'install', '--production' ], {
    cwd: path.join('./node_modules', module)
  });

  gatherOutputs('npm', npm, function (err, data) {
    if (err) return cb(err);

    log.info('install: installed `' + module + '`.');
    data.stdout.split('\n').forEach(function (l) {
      log.info('install: stdout - ' + l);
    });
    data.stderr.split('\n').forEach(function (l) {
      log.info('install: stderr - ' + l);
    });

    cb(null, data);
  });
};
