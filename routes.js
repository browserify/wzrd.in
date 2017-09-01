'use strict';

const auth = require('./middlewares/auth');
const bodyParser = require('body-parser');

const cullHandler = require('./handlers/cull');
const singularHandler = require('./handlers/singular');
const multiHandlers = require('./handlers/multiple');
const statusesHandler = require('./handlers/statuses');

module.exports = function (app, bundler, config) {
  app.get('/bundle/:slug', singularHandler(bundler));
  app.get('/debug-bundle/:slug', singularHandler(bundler, { debug: true }));
  app.get('/standalone/:slug', singularHandler(bundler, { standalone: true }));
  app.get('/debug-standalone/:slug', singularHandler(bundler, { standalone: true, debug: true }));

  app.post('/multi', bodyParser.json(), multiHandlers.create(bundler));
  app.get('/multi/:bundle', multiHandlers.get(bundler));

  app.get('/status/:bundle', statusesHandler(bundler));

  // Purge routes.
  // The PURGE method routes are dead code, For Now, since the "admin"
  // interface is already being used by the mods, with proposed work to
  // migrate to PURGE methods in future work.
  app.get('/admin/cull/:module', auth(config), cullHandler(bundler, config));
  /*
  app.purge('/bundle/:slug', singularHandler(bundler, { purge: true }));
  app.purge('/debug-bundle/:slug', singularHandler(bundler, { debug: true, purge: true }));
  app.purge('/standalone/:slug', singularHandler(bundler, { standalone: true, purge: true }));
  app.purge('/debug-standalone/:slug', singularHandler(bundler, { standalone: true, debug: true, purge: true }));
  app.purge('/multi/:bundle', multiHandlers.purge(bundler));
  */
}
