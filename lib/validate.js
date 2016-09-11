'use strict';

const joi = require('joi');

const inputSchema = exports.inputSchema = {
  module_scope: joi.string().allow(''),
  module_name: joi.string().required(),
  module_semver: joi.string().default('latest'),
  module_subfile: joi.string(),
  debug: joi.boolean().default(false),
  standalone: joi.boolean().default(false),
  full_paths: joi.boolean().default(false)
};

exports.validateInput = function(input) {
  const validated = joi.validate(input, inputSchema);

  if (validated.error) {
    throw validated.error;
  }
  return validated.value;
};
