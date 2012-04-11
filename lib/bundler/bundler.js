var EventEmitter2 = require('eventemitter2').EventEmitter2,
    browserify = require('browserify'),
    detective = require('detective'),
    npm = require('npm'),
    uglify = require('uglify-js'),
    util = require('utile'),
    common = require('../common');

var Bundler = module.exports = function (opts) {
  if (!(this instanceof Bundler)) {
    return new Bundler;
  }

  var bundler = this;

  bundler.options = opts || {};
  bundler.options.npm = bundler.options.npm || {};

  // Overrides falsy values such as `undefined`
  if (bundler.options.cache !== false) {
    bundler.options.cache = true;
  }

  // Add filtering with uglify
  if (!bundler.options.filter) {
    bundler.options.filter = uglify;
  }

  EventEmitter2.call(this, {
    wildcard: true,
    delimiter: '::',
    maxListeners: 0
  })

  bundler.ready = false;

  npm.load({}, function (err) {
    if (err) {
      // What would be really cool is if I checked to see if there was an error
      // event listener or not.
      bundler.emit('error', err);
    }

    bundler.ready = true;
    bundler.emit('bundler::ready');
  });
};

util.inherits(Bundler, EventEmitter2);

Bundler.prototype.bundle = function (src, cb) {
  var bundler = this,
      modules = detective(src);

  npm.commands.install(modules, function (err) {
    if (err) {
      cb(err);
    }

    var bundle, doc;

    try {
      bundle = browserify(bundler.options)
        .addEntry('index.js', { body: src || '' })
        .bundle();

      doc = {
        source: src,
        md5: common.md5(src),
        bundle: bundle
      };
    }
    catch (err) {
      return cb(err);
    }

    cb(null, doc);
  });
};

Bundler.attach = function (opts) {
  this.bundler = new Bundler(opts);
}

Bundler.init = function (done) {
  var npm = 'npm'.red.inverse;

  if (this.bundler.ready) {
    console.log('init: %s is ready.', npm);
    return done();
  } else {
    console.log('init: Waiting for %s.', npm);
    this.bundler.once('bundler::ready', function () {
      console.log('init: %s is ready.', npm);
      return done();
    });
  }
}
