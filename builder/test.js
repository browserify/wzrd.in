'use strict';

const Builder = require('./index');

const builder = new Builder();

builder._build({
  module_name: 'concat-stream',
  module_version: '1.5.2',
  standalone: true
}).then(console.log).catch((err) => {
  console.log(err);
  Object.keys(err).forEach((k) => {
    console.log('k:%j', err[k]);
  });
});
