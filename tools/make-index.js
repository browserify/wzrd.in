var fs = require('fs');
var path = require('path');
var marked = require('marked');

var readmeMd = path.join(__dirname, '../README.md');
var template = path.join(__dirname, '../templates/index.handlebars');
var indexHtml = path.join(__dirname, '../public/index.html');
var readme = marked(fs.readFileSync(readmeMd, 'utf8'));

var html = readme
  .replace(
    'https://wzrd.in/standalone/concat-stream@latest',
    '/standalone/concat-stream@latest'
  )
  .replace(
    '<p>Also, <a href="https://wzrd.in">wzrd.in</a> has a nice url generating form.</p>',
    '<form method="get" id="url-generator">' +
      '<h3>Or choose a module here:</h3>' +
      '<label>Module:' +
        '<input type="text" name="module" value="concat-stream" required />' +
      '</label>' +
      '<label>Version:' +
        '<input type="text" name="ver" value="latest" required />' +
      '</label>' +
      '<input type="submit" value="Go!" />' +
    '</form>'
  )

var src = fs.readFileSync(template, 'utf8');
fs.writeFileSync(indexHtml, src.replace('{{{readme}}}', html));
