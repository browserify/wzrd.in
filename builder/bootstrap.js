'use strict';

const Builder = require('./index');

const builder = new Builder();

builder.init().then(console.log).catch((err) => {
  console.log(err.stack);
  Object.keys(err).forEach((k) => {
    console.log(k, err[k]);
  });
});
