'use strict';

const NpmPublishStream = require('npm-publish-stream');
const log = require('minilog')('cull');
const semver = require('semver');

module.exports = function _cull(cache) {
  const db = cache.db;
  const pubStream = new NpmPublishStream({
    refreshRate: 2 * 60 * 1000,
    hostname: 'skimdb.npmjs.com',
    port: 443,
    protocol: 'https://'
  });

  pubStream.on('data', (data) => {
    const module = data.id;
    const version = data.doc['dist-tags'].latest; // Breaks under force publishes
    const start = module;                         // of olde versions...
    const end = start.slice(0, start.length - 1)  // TODO: Ask rvagg about this
              + String.fromCharCode(start.charCodeAt(start.length - 1) + 1);

    const stream = db.createKeyStream({ start: start, end: end });

    stream.on('data', function (key) {
      log.info('cull stream on data', key);
      const range = key.split('@').pop();

      if (semver.satisfies(version, range) || range == 'latest') {
        log.info('culling `' + module + '@' + range + '`...');
        db.del(key);
      }
    });
  });


  pubStream.on('error', function (err) {
    log.info('pubstream error:', err.message);
    log.info(err.stack);
  });

  return cache;
}
