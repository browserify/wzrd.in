'use strict';

const auth = require('../middlewares/auth');
const bodyParser = require('body-parser');

const createCullHandler = require('../controllers/cull');
const createSingularHandler = require('../handlers/singular');
const multiHandlers = require('../handlers/multi');

module.exports = function (app, bundler, config) {
  app.get('/bundle/:module', createSingularHandler(bundler));
  app.purge('/bundle/:module', createSingularHandler(bundler, { purge: true }));
  app.get('/debug-bundle/:module', createSingularHandler(bundler, { debug: true }));
  app.purge('/debug-bundle/:module', createSingularHandler(bundler, { debug: true, purge: true }));
  app.get('/standalone/:module', createSingularHandler(bundler, { standalone: true }));
  app.purge('/standalone/:module', createSingularHandler(bundler, { standalone: true, purge: true }));
  app.get('/debug-standalone/:module', createSingularHandler(bundler, { standalone: true, debug: true }));
  app.purge('/debug-standalone/:module', createSingularHandler(bundler, { standalone: true, debug: true, purge: true }));

  app.post('/multi', bodyParser.json(), multi.create(bundle));
  app.get('/multi/:bundle', multi.get(bundle));
  app.purge('/multi:bundle', multi.purge(bundle));

  app.get('/admin/cull/:module', auth(config), createCullHandler(bundle, config));
}
