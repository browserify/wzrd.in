'use strict';

const path = require('path');
const spawn = require('child_process').spawn;

const concat = require('concat-stream');
const hash = require('object-hash');
const joi = require('joi');
const Promise = require('bluebird');
const waitress = require('waitress');

const validate = require('../lib/validate');

class Builder {

  constructor(options) {
    options = options || {};
    this.DOCKER_TAG = options.dockerTag || 'browserify-builder';
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
          err = this._execError(
            cmd + ' exited with code ' + code,
            { code: code, stdout: stdout, stderr: stderr }
          );
          return reject(err);
        }
        return resolve({ stdout: stdout, stderr: stderr });
      });

      child.stdout.pipe(concat((_out) => {
        if (_out) {
          stdout = _out.toString();
        }
        finish();
      }));
      child.stderr.pipe(concat((_err) => {
        if (_err) {
          stderr = _err.toString();
        }
        finish();
      }));

      child.on('exit', (c) => {
        code = c;
        finish();
      });

      child.on('error', finish);
    });

    p.stdin = child.stdin;

    return p;
  }

  _getVersions() {
    return this.constructor._exec(
      'docker',
      [ 'run', '--rm', this.DOCKER_TAG, 'bash', './versions.sh' ]
    ).then((results) => {
      let output;
      const stderr = results.stderr;

      try {
        output = JSON.parse(results.stdout);
      }
      catch (parseError) {
        throw this.constructor._execError(
          'Could not parse result from fetching versions',
          Object.assign(results, { error: parseError.message })
        );
      }

      if (stderr) {
        throw this.constructor._execError(
          'Unexpected stderr while fetching versions',
          results
        );
      }

      return output;
    });
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

      const stdout = results.stdout;

      return this._getVersions().then((versions) => {
        this.versions = versions;
        return stdout;
      });
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
      options = validate.validateInput(options);

      const p = this.constructor._exec(
        'docker',
        // TODO: Sane setting for --name ?
        [ 'run', '-i', '--rm', this.DOCKER_TAG ]
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
          Object.assign(results, { error: parseError.message })
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

module.exports = Builder;
