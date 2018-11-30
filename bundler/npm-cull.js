var ChangesStream = require('changes-stream'),
    normalizeRegistryMetadata = require('normalize-registry-metadata'),
    log = require('minilog')('cull'),
    semver = require('semver');

module.exports = function _cull(cache) {
  var aliases = cache.db,
      pubStream = new ChangesStream({
        db: 'https://replicate.npmjs.com',
        include_docs: true,
        since: 'now'
      });

  pubStream.on('data', function (data) {
    var module = data.id,
        doc = normalizeRegistryMetadata(data.doc),
        version = doc['dist-tags'].latest, // Breaks under force publishes
        start = module,                    // of olde versions...
        end = start.slice(0, start.length - 1)     // TODO: Ask rvagg about this
              + String.fromCharCode(start.charCodeAt(start.length - 1) + 1);

    var stream = aliases.createKeyStream({ start: start, end: end });

    stream.on('data', function (key) {
      console.log('cull stream on data', key);
      var range = /(.+)@/.exec(key);
      if (range) range = range[1];
      if (!range) return;

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
