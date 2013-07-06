#!/usr/bin/env node

var http = require('http'),
    util = require('util'),
    config = require('./config.json');

function log() {
  var argv = [].slice.call(arguments),
      str = argv.shift();

  if (typeof str !== 'string') {
    str = util.inspect(str);
  }

  str = str.split('\n').map(function (l) {
    return '☺ ' + l;
  }).join('\n');

  console.log.apply(null, [ str ].concat(argv));
}

log('Hi! I am mr302!');

process.on('uncaughtException', function (err) {
  var msg = err.message.split('\n'),
      head = msg.shift();

  msg = msg.map(function (l) {
    return '☠ ' + l;
  });

  console.error('');
  console.error('%s: %s', err.name, head);
  console.error(msg.join('\n'));
  err.stack.split('\n').slice(msg.length + 1).forEach(function (l) {
    console.error(l);
  });
  process.exit(1);
});

var url = config.url,
    statusCode = parseInt(config.statusCode, 10) || 302;

function clientIp(req) {
  return (
    req.headers["X-Forwarded-For"] ||
    req.headers["x-forwarded-for"] ||
    req.client.remoteAddress
  );
};

if (statusCode < 301 || statusCode > 302) {
  throw new Error([
    'I can only do 301 and 302 redirects!',
    '',
    'Please set "statusCode" in your config.json to either:',
    '',
    ' * 301: Permanent redirects (permanently cached by the browser)',
    ' * 302: Ephemeral redirects (browser checks the server each time)',
    '',
    'Or, just leave it blank for a sane default (302)!',
    ''
  ].join('\n'));
}

log('I\'m doing %d redirects to %s today!', statusCode, url);

var server = http.createServer(function (req, res) {
  res.writeHead(statusCode, {'Location': url });
  res.end();
  log('%d redirected client at %s to %s !', statusCode, clientIp(req), url);
});

server.listen(8080, function (err) {
  if (err) {
    throw err;
  }

  var address = server.address();

  log('Now I\'m listening on http://%s:%d !', address.address, address.port);
});
