var gatherOutputs = require('./gather-outputs');

//
// Run npm link
//
module.exports = function link(env, module, cb) {
  var npm;

  env.log.info('link: linking `' + module + '`...');

  npm = env.spawn('npm', [ 'link', module], {});

  gatherOutputs('npm', npm, function (err, data) {
    if (err) return cb(err);

    env.log.info('link: linked `' + module + '`.');
    data.stdout.split('\n').forEach(function (l) {
      env.log.info('link: stdout - ' + l);
    });
    data.stderr.split('\n').forEach(function (l) {
      env.log.info('link: stderr - ' + l);
    });

    cb(null, data);
  });
};
