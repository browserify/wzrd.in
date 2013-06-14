var gatherOutputs = require('./gather-outputs');

//
// Unpack a tarball stream
//
module.exports = function unpack(env, stream, cb) {

  //
  // Ha! Ha! I'm using SYSTEM TAR!!
  //
  var tar = env.spawn('tar', [ '-xz' ]);

  stream.pipe(tar.stdin);

  gatherOutputs('tar', tar, cb);
};
