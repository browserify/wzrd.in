'use strict';

const path = require('path');
const spawn = require('child_process').spawn;

const concat = require('concat-stream');
const hash = require('object-hash');
const joi = require('joi');
const Promise = require('bluebird');
const waitress = require('waitress');

const schema = {
  module_scope: joi.string().optional(),
  module_name: joi.string().required(),
  module_version: joi.string().required(),
  module_subfile: joi.string().optional(),
  standalone: joi.boolean().default(false),
  debug: joi.boolean().default(false),
  full_paths: joi.boolean().default(false)
};

class Builder {

  constructor() {
    this.DOCKER_TAG = 'browserify-builder';
    this._inProgress = Object.create(null);
  }

  static _hash(options) {
    return hash(options);
  }

  static _execError(message, results) {
    const err = new Error(message);
    Object.assign(err, results);
    return err;
  }

  static _validate(input) {
    const validated = joi.validate(input, schema, { stripUnknown: true });
    if (validated.error) {
      throw validated.error;
    }
    return validated.value;
  }

  static _exec(cmd, argv, opts) {
    const child = spawn(cmd, argv, opts);

    const p = new Promise((resolve, reject) => {

      let stdout = '';
      let stderr = '';
      let code;

      const finish = waitress(3, (err) => {
        if (err) {
          return reject(err);
        }
        if (code) {
          err = this.constructor._execError(
            cmd + ' exited with code ' + code,
            { code: code, stdout: stdout, stderr: stderr }
          );
          return reject(err);
        }
        return resolve({ stdout: stdout, stderr: stderr });
      });

      child.stdout.pipe(concat(function (_out) {
        if (_out) {
          stdout = _out.toString();
        }
        finish();
      }));
      child.stderr.pipe(concat(function (_err) {
        if (_err) {
          stderr = _err.toString();
        }
        finish();
      }));

      child.on('exit', function (c) {
        code = c;
        finish();
      });

      child.on('error', finish);
    });

    p.stdin = child.stdin;

    return p;
  }

  init() {
    return this.constructor._exec(
      'docker',
      [ 'build', '.', '-t', this.DOCKER_TAG ],
      {
        cwd: path.join(__dirname, 'container')
      }
    ).then((results) => {
      if (results.stderr) {
        throw this.constructor._execError(
          'Unexpected stderr from docker init',
          results
        );
      }

      return results.stdout;
    });
  }

  build(options) {
    const key = this.constructor._hash(options);

    if (this._inProgress[key]) {
      return this._inProgress[key];
    }

    this._inProgress[key] = this._build(options);

    this._inProgress[key].then((result) => {
      this._inProgress[key] = undefined;
    });

    return this._inProgress[key];
  }

  _build(options) {
    return Promise.try(() => {
      options = this.constructor._validate(options);

      const p = this.constructor._exec(
        'docker',
        [ 'run', '-i', this.DOCKER_TAG ]
      );

      p.stdin.end(JSON.stringify(options));

      return p;
    }).then((results) => {
      let output;
      const stderr = results.stderr;

      try {
        output = JSON.parse(results.stdout);
      }
      catch (parseError) {
        throw this.constructor._execError(
          'Could not parse result from builder',
          Object.assign(results, { parseError: parseError.message })
        );
      }

      if (stderr) {
        throw this.constructor._execError(
          'Unexpected stderr from builder',
          results
        );
      }

      return output;
    });
  }
}

Builder.schema = schema;
module.exports = Builder;
