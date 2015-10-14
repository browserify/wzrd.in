var request = require('request');

exports.download = function download(module, version) {
  return request(
    'http://registry.npmjs.org/' +
    module + '/-/' +
    module + '-' + version + '.tgz'
  );
};
