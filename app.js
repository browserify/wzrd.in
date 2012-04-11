var path = require('path'),
    utile = require('utile');

utile.inspect = require('util').inspect;

var flatiron = require('flatiron'),
    app = flatiron.app;

// This is a new library used for running browserify bundle jobs for us.
var bundler = require('./bundler');

app.config.file({ file: path.join(__dirname, 'config.json') });

// Note that 'bundler' is written to work as a flatiron plugin.
app.use(flatiron.plugins.http);
app.use(bundler);

app.router.path('/', function () {
  this.get(function () {
    this.res.writeHead(200, { 'content-type': 'text/plain' });
    this.res.write('Welcome to the Browserify CDN! You probably want to post. Ex:\n\n');
    this.res.end('    curl -X POST -d \'var traverse = require("traverse");\' address:3600\n');
  });

  this.post(function () {

    // If the request body doesn't have the property we expect, it's assumed
    // to be raw javascript. Note that the raw unparsed body is buffered into
    // req.chunks (as a Buffer).
    var req = this.req,
        res = this.res,
        js = req.body.js ? req.body.js : req.chunks.toString();

    // 'app.bundler' was created when we attached 'bundler'.
    app.bundler.bundle(js, function (err, data) {
      if (err) {
        return res.json(500, {
          success: false,
          reason: err.message || 'unknown'
        });
      }
      res.writeHead(200, { 'content-type': 'text/javascript' });
      res.end(data.bundle);
    });
  });
});

app.start(app.config.get('port') || 8080, function (err) {
  if (err) {
    throw err;
  }

  var addr = app.server.address();

  app.log.info('Browserify-CDN Listening on http://' + addr.address + ':' + addr.port);
});
