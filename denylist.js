//
// Deny some clients that put way too much pressure on our humble VPS
//
module.exports = function denylist(req, res, next) {
  if (/nnn\.ed\.jp/.test(req.headers['referer'])) {
    res.statusCode = 429
    return res.end('too many requests');
  }
  if (req.url === '/standalone/text-encoding@0.6.4' &&
        /Peer5 Android SDK/.test(req.headers['user-agent'])) {
    res.statusCode = 429
    return res.end('too many requests');
  }
  next();
};
