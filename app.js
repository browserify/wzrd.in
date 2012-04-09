// Require flatiron and grab the app object.
var flatiron = require('flatiron'),
    app = flatiron.app;

// Use the http plugin. This makes flatiron act as an http server with a
// router on `app.router`.
app.use(flatiron.plugins.http);

// Route handler for http GET on the root path
app.router.get('/', function () {
  // The request and response objects are attached to `this`.
  var req = this.req,
      res = this.res;

  // Flatiron comes with a logging object already attached!
  app.log.info('Saying hello!');

  // Handle the response as you would normally.
  res.writeHead(200, { 'content-type': 'text/plain'});
  res.end('hello!');
});

// Start the server!
app.start(8080, function (err) {
  if (err) {
    // This would be a server initialization error. If we have one of these,
    // the server is probably not going to work.
    throw err;
  }

  // Log the listening address/port of the app.
  var addr = app.server.address();
  app.log.info('Listening on http://' + addr.address + ':' + addr.port);
});
