'use strict';

const validate = require('./validate');

module.exports = function parse(slug, _options) {
  const options = _options || {
    debug: false,
    standalone: false
  };

  const input = {
    module_semver: 'latest',
    debug: options.debug,
    standalone: options.standalone
  };

  const matches = slug.match(/^(@[^/]+)?(\/)?([^@]+)@?(.+)?/);

  if (matches) {
    input.module_scope = matches[1];
    input.module_name = matches[3] ? matches[3] : params;
    input.module_semver = matches[4] ? matches[4] : input.module_semver;
  }

  const subfile = input.module_name.split('/');

  if (subfile.length > 1) {
    input.module_name = subfile.shift();
    input.module_subfile = subfile.join('/');
  }

  validate.validateInput(input);

  return input;
}

