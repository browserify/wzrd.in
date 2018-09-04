var util = require('util');

var log = require('minilog')('browserify-cdn');
var uuid = require('uuid/v1');

var stringify = module.exports = function stringifyError(err) {
  var id = uuid(),
      internal = [],
      external = [ util.format('\n(logs uuid: %s )\n', id) ]

  if (err.stack) {
    err.stack.split('\n').forEach(function (l) {
      internal.push(l);
    });
  }
  else {
    internal.push(err.message || 'unspecified error');
  }

  if (err.message) {
    external.push('Error: "' + err.message + '"');
  }
  else {
    external.push('Error: An unspecified error has occurred.');
    external.push('(Yes, I know. How helpful.)');
  }

  internal.push('');
  external.push('');

  Object.keys(err).forEach(function (k) {
    var s = k + ': ' + util.format(err[k]);
    internal.push(s);
    external.push(s);
  });

  internal.forEach(function (l) {
    log.error(id + ' : ' + l);
  });

  external.push('');

  return external.join('\n');
};

stringify.hello = '---FLAGRANT SYSTEM ERROR---\n'

stringify.goodbye = [
  '',
  'This is probably an issue with the package, and not browserify-cdn itself.',
  'If you feel differently, feel free to file a bug report at:',
  '',
  '    https://github.com/browserify/wzrd.in/issues',
  '',
  'Include the ENTIRETY of the contents of this message, and the maintainer(s)',
  'can try to help you out.',
  '',
  'Have a nice day!',
  '',
  ''
].join('\n');
