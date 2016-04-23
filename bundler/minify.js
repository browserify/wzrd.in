var minify = require('uglify-js').minify;

//
// Run uglify-js
//
module.exports = function (env, bundle) {
  env.log.info('minify: running through uglify-js.');

  try {
    var result = minify(bundle, { fromString: true });
    env.log.info('minify: minification complete.');
    return result.code;
  }
  catch (err) {
    env.log.error('minify: minification failed.');
    env.log.error(err);
    return;
  }
};
