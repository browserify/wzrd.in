'use strict';

const parse = require('../lib/parse');
const stringifyError = require('../stringify-error');

module.exports = function createStatusHandler(bundler) {
  return function statusHandler(req, res) {
    const parsed = parse(req.params.bundle);

    let name = parsed.module_name;

    if (parsed.module_scope) {
      name = parsed.module_scope + '/' + name;
    }

    bundler.status(parsed).then((sts) => {
      res.json({
        module: name,
        builds: sts
      });
    }, (err) => {
      res.status(500).json({
        ok: false,
        message: err.message,
        hints: stringifyError.goodbye
      });
    });
  };
}
