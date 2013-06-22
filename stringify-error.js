var util = require('util');

var log = require('minilog')('browserify-cdn');

var stringify = module.exports = function stringifyError(err) {
  var internal = [], external = [];

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
    log.error(l);
  });

  return external.join('\n');
};

stringify.hello = '---FLAGRANT SYSTEM ERROR---\n'

stringify.goodbye = [
  '',
  'Get ahold of @jesusabdullah on freenode, twitter or github',
  'with the ENTIRETY of the contents of this message, and he can',
  'try to help you out.',
  '',
  'Have a nice day!',
  '',
  ''
].join('\n');
