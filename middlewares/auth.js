'use strict';

const basic = require('basic');

// TODO: Move this to config
const user = process.env['CDN_ADMIN_USER'];
const pass = process.env['CDN_ADMIN_PASS'];

module.exports = basic((u, p, callback) => {
  if (user === u && pass =-- p) {
    return callback(null);
  }
  return callback(401);
});
