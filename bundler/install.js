var gatherOutputs = require('./gather-outputs');
var registryURL = require('./registry').registryURL;

//
// Run npm install
//
module.exports = function install(env, module, cb) {
  var npm;

  env.log.info('install: installing `' + module + '`...');

  npm = env.spawn('npm', [ 'install', '--production', '--registry', registryURL ], {
    cwd: 'node_modules/' + module
  });

  gatherOutputs('npm', npm, function (err, data) {
    if (err) return cb(err);

    env.log.info('install: installed `' + module + '`.');
    data.stdout.split('\n').forEach(function (l) {
      env.log.info('install: stdout - ' + l);
    });
    data.stderr.split('\n').forEach(function (l) {
      env.log.info('install: stderr - ' + l);
    });

    cb(null, data);
  });
};
