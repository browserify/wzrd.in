var path = require('path'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec;

var sfs = require('scopedfs'),
    temp = require('temp'),
    rimraf = require('rimraf'),
    mkdirp = require('mkdirp'),
    glob = require('glob'),
    minilog = require('minilog');

//
// Set up a "build env"
//
module.exports = function buildEnv(options, cb) {

  var env = {};

  //
  // TODO: Jailing
  // (this is not safe at all, it's just for convenience right now)
  //

  //
  // Create the "build folder"
  //
  temp.mkdir(options.root, function (err, dirPath) {
    if (err) {
      return cb(err);
    }

    var env = {};

    env.log = minilog(dirPath);
    env.dirPath = dirPath;

    env.log.info('build-env: setting up build environment...');

    //
    // "scoped" fs operations
    //
    env.fs = sfs.scoped(dirPath);

    //
    // "spawn" is always in that cwd
    //
    env.spawn = function () {
      var argv = [].slice.call(arguments),
          _env = JSON.parse(JSON.stringify(process.env));

      _env.PATH = path.resolve(__dirname, '../node_modules/.bin') + ':' + _env.PATH;


      if (!argv[1]) {
        argv[1] = [];
      }

      if (!argv[2]) {
        argv[2] = {};
      }

      argv[2].cwd = argv[2].cwd
        ? path.join(dirPath, argv[2].cwd)
        : dirPath
      ;

      argv[2].env = _env;

      return spawn.apply(spawn, argv);
    };

    //
    // same with exec
    //
    env.exec = function () {
      var argv = [].slice.call(arguments),
          _env = JSON.parse(JSON.stringify(process.env));

      if (argv.length === 2) {
        argv = [ argv[0] ].concat({ cwd: dirPath }).concat(argv[1]);
      }
      else {
        argv[1].cwd = argv[1].cwd
          ? path.join(dirPath, argv[1].cwd)
          : dirPath
        ;
      }

      argv[1].env = _env;

      return exec.apply(exec, argv);
    };

    //
    // remove the folder
    //
    env.teardown = function (cb) {

      cb = cb || function () {};

      env.log.info('build-env: removing `' + dirPath + '`...');

      return rimraf(dirPath, function (err) {
        if (err) {
          env.log.warn('build-env: no dice while trying to remove `' + dirPath + '`:');
          env.log.warn(err.stack);
        }

        env.log.info('build-env: successfully removed `' + dirPath + '`.');
        cb(err);
      });
    }

    env.mkdirp = function (p, cb) {
      return mkdirp(path.join(dirPath, p), cb);
    };

    env.glob = function (g, opts, cb) {
      opts.cwd = path.join(dirPath, opts.cwd);
      return glob(g, opts, cb);
    };

    env.log.info('build-env: set up build environment.');
    cb(null, env);
  });
};
