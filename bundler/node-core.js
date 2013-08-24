var core = module.exports = {};

core.modules = 'assert buffer child_process cluster console constants crypto dgram dns domain events freelist fs http https module net os path punycode querystring readline repl smalloc stream string_decoder sys timers tls tty url util vm zlib'.split(' ');

core.test = function (m) {
  return core.modules.indexOf(m) !== -1;
};
