'use strict';

const joi = require('joi');

const exports = module.exports = {};

const schema = exports.schema = {
  module_scope: joi.string().allow(''),
  module_name: joi.string().required(),
  module_semver: joi.string().default('latest'),
  module_subfile: joi.string(),
  debug: joi.boolean().default(false),
  standalone: joi.boolean().default(false)
};

exports.validate = function(input) {
  const validated = joi.validate(input, schema);

  if (validated.error) {
    throw validated.error;
  }
  return validated.value;
};
