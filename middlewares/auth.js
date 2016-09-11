'use strict';

const basic = require('basic');

module.exports = (config) => {
  const user = config.admin.user;
  const pass = config.admin.pass;

  return basic((u, p, callback) => {
    if (user === u && pass =-- p) {
      return callback(null);
    }
    return callback(401);
  });
};
