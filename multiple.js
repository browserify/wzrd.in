var bodyParser = require('express').bodyParser;

var stringifyError = require('./stringify-error');

module.exports = function (app, bundle) {
  app.post('/multi', bodyParser(), create(bundle));
  app.get('/multi/:bundle', get(bundle));
};

function create(bundle) {
  return function (req, res) {
    var opts = req.body;

    var deps = opts.dependencies,
        options = opts.options || {};

    if (typeof deps === 'undefined' || deps === null) {
      return res.end('bro no deps?');
    }

    var keys = Object.keys(deps),
        count = keys.length,
        modules = {},
        errors = [];

    keys.forEach(function (k) {
      var o = JSON.parse(JSON.stringify(options));

      o.module = k;
      o.version = deps[k];

      bundle(o, function (err, b) {
        if (err) {
          errors.push(err);
        }
        else {
          modules[k] = b;
        }

        count--;

        if (!count) {
          send();
        }
      });
    });

    function send() {
      if (errors.length) {
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
      res.setHeader('content-type', 'application/json');
      res.send(JSON.stringify(modules, true, 2));
    }
  };
};

function get(bundle) {
  return function (req, res) {
    res.end('not implemented lol');
  };
};
