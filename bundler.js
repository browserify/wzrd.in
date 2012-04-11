var EventEmitter2 = require('eventemitter2').EventEmitter2,
    browserify = require('browserify'),
    detective = require('detective'),
    npm = require('npm'),
    crypto = require('crypto'),
    util = require('utile');

// I wrote the Bundler as a constructor with prototype methods.
// I find that it's a good fit for stateful problems.
var Bundler = module.exports = function (opts) {

  // This lets you create a new Bundler without the 'new' keyword.
  if (!(this instanceof Bundler)) {
    return new Bundler;
  }

  var bundler = this;

  // Set the bundler's persistent options here. Also handle defaults.
  bundler.options = opts || {};
  bundler.options.npm = bundler.options.npm || {};

  // Overrides falsy values such as `undefined`
  if (bundler.options.cache !== false) {
    bundler.options.cache = true;
  }

  // Bundler inherits from an EE2 with wildcards and the :: delimiter.
  EventEmitter2.call(this, {
    wildcard: true,
    delimiter: '::',
    maxListeners: 0
  })

  // Bundler requires a loaded npm in order to work properly.
  // The rest of the code in the constructor sets this up and emits events
  // to signal when it's ready.
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

// The 'bundle' method is what actually attempts to bundle your project.
Bundler.prototype.bundle = function (src, cb) {
  var bundler = this,
      modules = detective(src);

  // We used 'detective' to get a list of needed modules, so that we can make
  // sure they're installed before trying to browserify.
  npm.commands.install(modules, function (err) {
    if (err) {
      cb(err);
    }

    var bundle;

    // Attempt to browserify the passed-in javascript source
    try {
      bundle = browserify(this.options)
        .addEntry('index.js', { body: src || '' })
        .bundle();

      // Hit the callback with our complete bundle object.
      cb(null, {
        src: src,
        md5: crypto.createHash('md5').update(src).digest('base64'),
        bundle: bundle
      });
    }
    catch (err) {
      cb(err);
    }
  });
};

// Bundler can be used as a broadway plugin.
Bundler.attach = function (opts) {
  this.bundler = new Bundler(opts);
}

// The major win we get from making Bundler attachable is that we can integrate
// its initialization step with our app.
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
