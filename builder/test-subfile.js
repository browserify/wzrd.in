'use strict';

const Builder = require('./index');

const builder = new Builder();

builder._build({
  module_name: 'jsonml-stringify',
  module_subfile: 'dom',
  module_version: '1.0.1',
  standalone: true
}).then((result) => {
  console.log('result');
//  console.log(JSON.parse(result));

}).catch((err) => {

  console.log('there was an error');

  console.log(err.stack);
  Object.keys(err).forEach((k) => {
    console.log(`${k}:` +  String(err[k]).replace('\\n', '\n'));
  });
});
