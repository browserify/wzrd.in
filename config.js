'use strict';

const _ = require('lodash');

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

const config = module.exports = {
  admin: {
    // CDN namespace for backwards compt
    user: process.env.CDN_ADMIN_USER || process.env.WZRDIN_ADMIN_USER || null,
    pass: process.env.CDN_ADMIN_USER || process.env.WZRDIN_ADMIN_PASS || null
  },
  builder: {
    dockerTag: process.env.WZRDIN_DOCKER_TAG || 'browserify-builder'
  },
  // Defaults from here https://github.com/expressjs/cors/blob/master/lib/index.js#L7-L12
  cors: {
    origin: process.env.WZRDIN_CORS_ORIGIN || '*',
    // This one's locked down a little
    methods: process.env.WZRDIN_CORS_METHODS || [ 'GET,POST' ],
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  level: {
    db: './cdn.db'
  },
  npm: {
    registry: process.env.WZRDIN_NPM_REGISTRY || 'http://registry.npmjs.org',
    skimdb: process.env.WZRDIN_NPM_SKIMDB || 'https://skimdb.npmjs.com:443',
    follower: {
      refreshRate: parseInt(process.env.WZRDIN_NPM_FOLLOWER_REFRESHRATE) || 2 * MINUTES
    }
  },
  server: {
    port: parseInt(process.env.PORT || process.argv[2]) || 8080
  }
};

