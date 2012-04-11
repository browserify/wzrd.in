var path = require('path'),
    utile = require('utile'),
    ecstatic = require('ecstatic'),
    colors = require('colors');

utile.inspect = require('util').inspect;

var flatiron = require('flatiron'),
    app = flatiron.app;

var bundler = require('./lib/bundler');

var title = 'Browserify-CDN'.rainbow;

app.config.file({ file: path.join(__dirname, 'config.json') });

app.use(flatiron.plugins.http);
app.use(bundler);

app.router.path('/', function () {
  this.post(function () {

    var req = this.req,
        res = this.res,
        js = req.body.js ? req.body.js : req.chunks.toString();

    app.bundler.get(js, function (err, data) {
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

// Use ecstatic as a middleware.
app.http.before.push(ecstatic(path.resolve(__dirname, 'public'), {
  handleErrors: false
}));

app.start(app.config.get('port') || 8080, function (err) {
  if (err) {
    throw err;
  }

  var addr = app.server.address();

  app.log.info(title + ' Listening on http://' + addr.address + ':' + addr.port);
});
