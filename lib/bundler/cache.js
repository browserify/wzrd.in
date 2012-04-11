var Bundler = require('./bundler'),
    common = require('../common'),
    resourceful = require('resourceful'),
    errs = require('errs'),
    colors = require('colors'),
    utile = require('utile');

// Cached bundle resources.
var CachedBundle = resourceful.define('cachedBundle', function () {
  this.string('md5');
  this.string('source');
  this.string('bundle');
});

// A version of the bundler that caches. Use `.get(text)`.
var CachingBundler = module.exports = function (opts) {
  // This lets you create a new caching Bundler without the 'new' keyword.
  if (!(this instanceof CachingBundler)) {
    return new CachingBundler;
  }

  opts = opts || {};
  Bundler.call(this, opts);
  // Set up resourceful to use couchdb.
  resourceful.use('couchdb', opts);
}

utile.inherits(CachingBundler, Bundler);

CachingBundler.prototype.get = function (src, cb) {
  var self = this,
      md5 = common.md5(src);

  // This logging function simply adds some extra text to the message and
  // then emits it with the event 'log::lvl' (ex: 'log::info').
  function log (lvl, msg) {
    var restOf = [].slice.call(arguments, 2),
        data = utile.format.apply(
          null,
          [ '(md5 `%s`) '.cyan + msg, md5 ].concat(restOf)
        );

    self.emit('log::' + lvl, data);
  }

  log('info', 'Trying to find bundle...');

  // Check to see if the file already exists in the cache, based on md5 hash of
  // the source text. This logic accounts for the possibility of hash collisions
  // and multiple versions of the same bundle.
  CachedBundle.find({ md5: md5 }, function (err, bundles) {
    if (err) {
      return cb(realError(err));
    }

    var matches;

    if (!bundles.length) {
      // No cached bundles found. We should bundle.
      log('warn', 'Not found.');
      return bundle(src);
    }

    // Log the document id's for found bundles. If there is more than one
    // bundle, it means there was either an md5 hash collision or multiple
    // documents for the same bundle exist.
    log('info', 'Found bundle(s): %j', bundles.map(function (doc) {
      return doc._id;
    }));

    // Try to find one that has the same text.
    matches = bundles.filter(function (bundle) {
      return bundle.source == src;
    });

    // Any answer other than 1 means an actual md5 hash collison.
    switch (matches.length) {
      case 1:
        log('info', 'Match found.');
        finish(null, matches[0]);
        break;
      case 0:
        log('info', 'Hash collision with existing document(s) %j', matches);
        bundle(src);
        break;
      default:
        log('Multiple documents describing this document exist.');
        log('Showing the first one.');
        finish(null, matches[0]);
        break;
    }
  });

  // This function is called when we need to bundle. It addition to logging, it
  // also attempts to cache the resulting bundle.
  function bundle (src) {
    log('info', 'Bundling.');
    self.bundle(src, function (err, doc) {
      if (err) {
        return cb(err);
      }

      // Here, we create a new CachedBundle, which maps to our data store.
      var bundle = new CachedBundle(doc);

      // This is how you save resources with resourceful.
      log('info', 'Caching bundle for next time...')
      CachedBundle.save(bundle, function (err, bundle) {
        if (err) {
          log('error', 'Error while caching bundle');
        }
        return finish(realError(err), bundle);
      });

    });
  }

  // This is pretty much the last step, whether the doc came from the cache
  // or from a bundling.
  function finish (err, bundle) {
    if (err) {
      return cb(err);
    }

    log('info', 'Returning bundle.');
    cb(null, bundle);
  }

};


// Attach the caching bundler, passing in our config options for the couch.
// Also emits logging events to the app.
CachingBundler.attach = function (options) {
  var app = this;

  this.bundler = new CachingBundler(utile.mixin(
    options,
    this.config.get('couch')
  ));

  // Little known fact about flatiron: The logging plugin will log messages
  // emitted on the `log` namespace of the core app, which is an instance of
  // EventEmitter2.
  app.bundler.on('log::**', function (msg) {
    app.emit(this.event, msg);
  });

};

CachingBundler.init = Bundler.init;

// A helper because, unfortunately, sometimes cradle returns errors that
// aren't of type Error and look like [object Object] when thrown.
function realError(err) {
  return err ? errs.merge(new Error(err.message || err.reason), err) : err;
}
