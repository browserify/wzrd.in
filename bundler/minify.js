var minify = require('terser').minify;

//
// Run uglify-js
//
module.exports = function (env, bundle) {
  env.log.info('minify: running through terser.');

  try {
    var result = minify(bundle);
    env.log.info('minify: minification complete.');
    return result.code;
  }
  catch (err) {
    env.log.error('minify: minification failed.');
    env.log.error(err);
    return;
  }
};
