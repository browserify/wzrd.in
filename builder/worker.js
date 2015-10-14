var xtend = require('xtend'),
    concat = require('concat-stream'),
    minimist = require('minimist');

var builder = require('./index');

// Do something with the log
var log = require('./log');

process.stdin.pipe(concat({ encoding: 'string' }, function(stdin) {
  var input = JSON.stringify(stdin);

  builder(input, function(err, result) {
    if (err) {
      throw err;
    }

    process.stdout.end(JSON.stringify(result));
  });
}));
