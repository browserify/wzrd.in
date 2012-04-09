var path = require('path');

var flatiron = require('flatiron'),
    app = flatiron.app;

// Set up app.config to use ./config.json to get and set configuration settings.
app.config.file({ file: path.join(__dirname, 'config.json') });

app.use(flatiron.plugins.http);

// This router syntax allows you to define multiple handlers for one path based
// on http method.
app.router.path('/', function () {

  // This is the same functionality as previously.
  this.get(function () {
    this.res.writeHead(200, { 'content-type': 'text/plain' });
    this.res.end('hello!');
  });

  // Now, when you post a body to the server, it will reply with a JSON
  // representation of the same body.
  this.post(function () {
    this.res.json(200, this.req.body);
  });
});

// Now we're using app.config to set the port, with a default of 8080.
app.start(app.config.get('port') || 8080, function (err) {
  if (err) {
    throw err;
  }

  var addr = app.server.address();
  app.log.info('Listening on http://' + addr.address + ':' + addr.port);
});
