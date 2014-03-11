var NpmPublishStream = require('npm-publish-stream'),
    log = require('minilog')('cull'),
    semver = require('semver');

module.exports = function _cull(cache) {
  var aliases = cache.db,
      pubStream = new NpmPublishStream({
        refreshRate: 2 * 60 * 1000,
        hostname: 'skimdb.npmjs.com',
        port: 443,
        protocol: 'https://'
      });

  pubStream.on('data', function (data) {
    var module = data.id,
        version = data.doc['dist-tags'].latest, // Breaks under force publishes
        start = module,                         // of olde versions...
        end = start.slice(0, start.length - 1)     // TODO: Ask rvagg about this
              + String.fromCharCode(start.charCodeAt(start.length - 1) + 1);

    var stream = aliases.createKeyStream({ start: start, end: end });

    stream.on('data', function (key) {
      console.log('cull stream on data', key);
      var range = key.split('@').pop();

      if (semver.satisfies(version, range) || range == 'latest') {
        log('culling `' + module + '@' + range + '`...');
        aliases.del(key);
      }
    });
  });


  pubStream.on('error', function (err) {
    log('pubstream error:', err.message);
    log(err.stack);
  });

  return cache;
}
