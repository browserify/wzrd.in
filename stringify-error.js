'use strict';

const util = require('util');

const log = require('minilog')('wzrd.in');
const uuid = require('uuid').v1;

const stringify = module.exports = function stringifyError(err) {
  const id = uuid();
  const internal = [];
  const external = [ util.format('\n(logs uuid: %s )\n', id) ];

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
    const v = err[k];

    if (typeof v === 'string') {
      if (v) {
        push(`---${k}---\n${indent(v)}\n`);
      }
      else {
        push(`---${k}---\n    (blank string)\n`);
      }
    }
    else {
      push(`---${k}---\n${indent(util.format(v))}\n`);
    }

    function indent(txt) {
      return txt.split('\n').map((l) => '    ' + l).join('\n');
    }

    function push(s) {
      internal.push(s);
      external.push(s);
    }
  });

  internal.forEach(function(txt) {
    txt.split('\n').forEach((l) => {
      log.error(id + ' : ' + l);
    });
  });

  external.push('');

  return external.join('\n');
};

stringify.hello = '---FLAGRANT SYSTEM ERROR---\n'

stringify.goodbye = [
  '',
  'This is probably an issue with the package, and not wzrd.in itself.',
  'If you feel differently, feel free to file a bug report at:',
  '',
  '    https://github.com/jfhbrook/wzrd.in/issues',
  '',
  'Include the ENTIRETY of the contents of this message, and the maintainer(s)',
  'can try to help you out.',
  '',
  'Have a nice day!',
  '',
  ''
].join('\n');
