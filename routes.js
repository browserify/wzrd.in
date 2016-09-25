'use strict';

const auth = require('./middlewares/auth');
const bodyParser = require('body-parser');

const cullHandler = require('./handlers/cull');
const singularHandler = require('./handlers/singular');
const multiHandlers = require('./handlers/multiple');
const statusesHandler = require('./handlers/statuses');

module.exports = function (app, bundler, config) {
  app.get('/bundle/:slug', singularHandler(bundler));
  app.purge('/bundle/:slug', singularHandler(bundler, { purge: true }));
  app.get('/debug-bundle/:slug', singularHandler(bundler, { debug: true }));
  app.purge('/debug-bundle/:slug', singularHandler(bundler, { debug: true, purge: true }));
  app.get('/standalone/:slug', singularHandler(bundler, { standalone: true }));
  app.purge('/standalone/:slug', singularHandler(bundler, { standalone: true, purge: true }));
  app.get('/debug-standalone/:slug', singularHandler(bundler, { standalone: true, debug: true }));
  app.purge('/debug-standalone/:slug', singularHandler(bundler, { standalone: true, debug: true, purge: true }));

  app.post('/multi', bodyParser.json(), multiHandlers.create(bundler));
  app.get('/multi/:bundle', multiHandlers.get(bundler));
  app.purge('/multi/:bundle', multiHandlers.purge(bundler));

  app.get('/status/:bundle', statusesHandler(bundler));

  app.get('/admin/cull/:module', auth(config), cullHandler(bundler, config));
}
