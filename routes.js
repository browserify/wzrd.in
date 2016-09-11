'use strict';

const auth = require('./middlewares/auth');
const bodyParser = require('body-parser');

const cullHandler = require('./handlers/cull');
const singularHandler = require('./handlers/singular');
const multiHandlers = require('./handlers/multiple');

module.exports = function (app, bundler, config) {
  app.get('/bundle/:module', singularHandler(bundler));
  app.purge('/bundle/:module', singularHandler(bundler, { purge: true }));
  app.get('/debug-bundle/:module', singularHandler(bundler, { debug: true }));
  app.purge('/debug-bundle/:module', singularHandler(bundler, { debug: true, purge: true }));
  app.get('/standalone/:module', singularHandler(bundler, { standalone: true }));
  app.purge('/standalone/:module', singularHandler(bundler, { standalone: true, purge: true }));
  app.get('/debug-standalone/:module', singularHandler(bundler, { standalone: true, debug: true }));
  app.purge('/debug-standalone/:module', singularHandler(bundler, { standalone: true, debug: true, purge: true }));

  app.post('/multi', bodyParser.json(), multiHandlers.create(bundler));
  app.get('/multi/:bundle', multiHandlers.get(bundler));
  app.purge('/multi:bundle', multiHandlers.purge(bundler));

  app.get('/admin/cull/:module', auth(config), cullHandler(bundler, config));
}
