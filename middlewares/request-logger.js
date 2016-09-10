var util = require('util');

var log = require('minilog')('http');

module.exports = function requestLogger(req, res, next) {

  //
  // Pretty much copypasta from
  // https://github.com/senchalabs/connect/blob/master/lib/middleware/logger.js#L135-L158
  //
  // Monkey punching res.end. It's dirty but, maan I wanna log my status
  // codes!
  //
  var end = res.end;
  res.end = function (chunk, encoding) {
    res.end = end;
    res.end(chunk, encoding);

    var remoteAddr = (function () {
          if (req.ip) return req.ip;
          var sock = req.socket;
          if (sock.socket) return sock.socket.remoteAddress;
          if (sock.remoteAddress) return sock.remoteAddress;
          return ' - ';
        })(),
        date = new Date().toUTCString(), // DEFINITELY not CLF-compatible.
        method = req.method,
        url = req.originalUrl || req.url,
        httpVersion = req.httpVersionMajor + '.' + req.httpVersionMinor,
        status = res.statusCode;

    // Similar to, but not anywhere near compatible with, CLF. So don't try
    // parsing it as CLF.
    //
    log.info(util.format(
      '%s - - [%s] "%s %s HTTP/%s" %s',
      remoteAddr,
      date,
      method,
      url,
      httpVersion,
      status
    ));
  };

  next();
};
