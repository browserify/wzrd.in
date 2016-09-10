'use strict';

module.exports = {
  modules: 'assert buffer child_process cluster console constants crypto dgram dns domain events freelist fs http https module net os path punycode querystring readline repl smalloc stream string_decoder sys timers tls tty url util vm zlib'.split(' '),
  test(m) {
    return this.modules.indexOf(m) !== -1;
  }
};

