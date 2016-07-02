var Replacer = require('replacer')
process.stdin
	.pipe(new Replacer(
		'https://wzrd.in/standalone/concat-stream@latest',
		'/standalone/concat-stream@latest'
	))
	.pipe(new Replacer(
		'<p>Also, <a href="https://wzrd.in">wzrd.in</a> has a nice url generating form.</p>',
		'<form method="get" id="url-generator"><h3>Or choose a module here:</h3><label>Module:<input type="text" name="module" value="concat-stream" required /></label><label>Version:<input type="text" name="ver" value="latest" required /></label><input type="submit" value="Go!" /></form>'
	))
	.pipe(process.stdout)