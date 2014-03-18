var stringifyError = require('./stringify-error');

module.exports = function (app, bundle) {
  app.post('/multi', jsonParser, create(bundle));
  app.get('/multi/:bundle', get(bundle));
};

//
// We're only doing JSON bodies, content-type be damned.
//
function jsonParser(req, res, next) {
  req.chunks = '';

  req.on('data', function (buff) {
    req.chunks += buff.toString();
  });

  req.on('end', function () {
    try {
      req.body = JSON.parse(req.chunks);
      
    } catch(e) {
      res.setHeader(500)
      res.end('{"error": "invalid json"}')
      return
    }
    next();
  });
};

function create(bundle) {

  var cache = bundle.cache;

  return function (req, res) {
    var opts = req.body;

    var deps = opts.dependencies,
        options = opts.options || {};

    if (typeof deps === 'undefined' || deps === null) {
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain');
      res.write(stringifyError.hello);
      res.write(stringifyError(new Error(
        'Multibundles *must* have specified dependencies.\n' +
        'Otherwise this exercise is pretty much pointless.'
      )));
      return res.end(stringifyError.goodbye);
    }

    cache.multibundles.check(cache.defaultHashFxn(opts), function multibundle(cb) {
      var keys = Object.keys(deps),
          count = keys.length,
          modules = {},
          errors = [];

      keys.forEach(function (k) {
        var o = JSON.parse(JSON.stringify(options)),
            subfile;

        o.module = k;
        o.version = deps[k];

        subfile = k.split('/');
        if (subfile.length > 1) {
          o.module = subfile.shift();
          o.subfile = subfile.join('/');
        }

        bundle(o, function (err, b) {
          if (err) {
            errors.push(err);
          }
          else {
            modules[k] = b;
          }

          count--;

          if (!count) {
            handleBundle();
          }
        });
      });

      function handleBundle() {
        if (errors.length) {
          //
          // End the request. Don't try caching.
          //
          res.statusCode = 500;
          res.setHeader('content-type', 'text/plain');
          res.write(stringifyError.hello);
          errors.forEach(function (e, i) {
            res.write('\n--- error #' + i + ': ---\n\n');
            res.write(stringifyError(e));
            res.write('\n');
          });
          res.write('\n------\n');
          return res.end(stringifyError.goodbye);
        }
        return cb(null, JSON.stringify(modules, true, 2));
      }
    }, function (err, _b) {
      if (err) {
        res.statusCode = 500;
        res.setHeader('content-type', 'text/plain');
        res.write(stringifyError.hello);
        res.write(stringifyError(err));
        return res.end(stringifyError.goodbye);
      }

      //
      // It seems 302s cause problems with certain use cases.
      // I still include the Location header here though, so that one may
      // pull it out programmatically if they wish.
      //
      // res.statusCode = 302;
      res.setHeader('Location', '/multi/' + encodeURIComponent(cache.defaultHashFxn(opts)));
      res.setHeader('content-type', 'application/json');
      res.end(_b);
    });
  };
};

function get(bundle) {

  var cache = bundle.cache;

  return function (req, res) {

    var hash = req.params.bundle;

    cache.multibundles(decodeURIComponent(hash), function nope(cb) {
      res.statusCode = 404;
      res.setHeader('content-type', 'text/plain');
      res.write(stringifyError.hello);
      res.write(stringifyError(new Error(
        'The requested bundle does not exist.\n' +
        'Have you tried POSTING to `/multi`?'
      )));
      return res.end(stringifyError.goodbye);

    }, function yup(err, b) {
      if (err) {
        //
        // This should not happen.
        //
        res.statusCode = 500;
        res.setHeader('content-type', 'text/plain');
        res.write(stringifyError.hello);
        res.write(stringifyError(err));
        return res.end(stringifyError.goodbye);
      }
      res.setHeader('content-type', 'application/json');
      return res.end(b);
    });
  };
};
