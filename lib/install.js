var gatherOutputs = require('./gather-outputs');

//
// Run npm install
//
module.exports = function install(env, module, cb) {
  var npm;

  env.log.info('installing `' + module + '`...');

  npm = env.spawn('npm', [ 'install', '--production' ], {
    cwd: 'node_modules/' + module
  });

  gatherOutputs('npm', npm, cb);
};
