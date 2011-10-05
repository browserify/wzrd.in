# browserify.nodejitsu.com

Too lazy to browserify things yourself? No need! With browserify.nodejitsu.com, all you need to do is include a script!

1. Include your bundle:

    <script src='http://browserify.nodejitsu.com/?require=["mrcolor"]' type="text/javascript"></script>

2. Receive bacon:

    var require = function (file, cwd) {
    // . . .

# GUYS THIS IS WAY ALPHA:

1. Naively tries to install dependencies
2. No cache-ing
3. ??!?!

# License:

MIT.
