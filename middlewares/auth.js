'use strict';

const _ = require('lodash');
const basic = require('basic');

module.exports = (config) => {
  const user = _.get(config, 'admin.user');
  const pass = _.get(config, 'admin.pass');

  function unauthorizedError() {
    return Object.assign(new Error('Unauthorized'), { error: 'Unauthorized', code: 401 });
  }

  let auth;
  if (!user || !pass) {
    auth = function noAuth(req, res, next) {
      next(unauthorizedError());
    };
  }
  else {
    auth = basic((u, p, callback) => {
      if (user === u && pass === p) {
        return callback(null);
      }
      callback(unauthorizedError())
    });
  }

  return function(req, res, next) {
    auth(req, res, (err) => {
      if (err) {
        res.setHeader("WWW-Authenticate", "Basic realm=\"Secure Area\"")
        return res.json(err);
      }

      next(null);
    });
  };
};
