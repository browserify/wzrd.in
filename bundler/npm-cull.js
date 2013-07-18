var NpmPublishStream = require('npm-publish-stream'),
    log = require('minilog')('cull');

module.exports = function (cache) {
  var aliases = cache.db.sublevel('aliases'),
      pubStream = new NpmPublishStream;

  pubStream.on('data', function (data) {
    var module = data.id,
        version = data.doc['dist-tags'].latest, // Breaks under force publishes
        start = module,                         // of olde versions...
        end = start.slice(0, start.length - 1)     // TODO: Ask rvagg about this
              + String.fromCharCode(start.charCodeAt(start.length - 1) + 1);

    var stream = aliases.createKeyStream({ start: start, end: end });

    stream.on('data', function (key) {
      var range = key.split('@').pop();

      if (semver.satisfies(version, range) || range == 'latest') {
        log('culling `' + module + '@' + range + '`...');
        aliases.del(key);
      }
    });
  });

  return cache;
}
