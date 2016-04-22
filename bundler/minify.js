var minify = require('uglify-js').minify;

//
// Run uglify-js
//
module.exports = function (env, bundle, cb) {
  env.log.info('minify: running through uglify-js.');

  try {
    var result = minify(bundle, { fromString: true });

    process.nextTick(function () {
      env.log.info('minify: minification complete.');
      cb(null, result.code);
    });
  }
  catch (err) {
    process.nextTick(function () {
      cb(err);
    })
  }
};
