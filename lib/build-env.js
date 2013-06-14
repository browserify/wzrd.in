var path = require('path'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec;

var sfs = require('scopedfs'),
    temp = require('temp'),
    rimraf = require('rimraf'),
    mkdirp = require('mkdirp');

//
// Set up a "build env"
//
module.exports = function buildEnv(options, cb) {

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

    //
    // "scoped" fs operations
    //
    env.fs = sfs.scoped(dirPath);

    //
    // "spawn" is always in that cwd
    //
    env.spawn = function () {
      var argv = [].slice.call(arguments);

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

      return spawn.apply(spawn, argv);
    };

    //
    // same with exec
    //
    env.exec = function () {
      var argv = [].slice.call(arguments);

      if (argv.length === 2) {
        argv = [ argv[0] ].concat({ cwd: dirPath }).concat(argv[1]);
      }
      else {
        argv[1].cwd = argv[1].cwd
          ? path.join(dirPath, argv[1].cwd)
          : dirPath
        ;
      }

      return exec.apply(exec, argv);
    };

    //
    // remove the folder
    //
    env.teardown = function (cb) {
      return rimraf(options.root, cb);
    }

    env.mkdirp = function (p, cb) {
      return mkdirp(path.join(dirPath, p), cb);
    }

    cb(null, env);
  });
};
