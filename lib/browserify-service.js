var browserify = require("browserify");
var npm = require("npm");
var qs = require("qs");

var buildBundle = function (modules) {
    npm.load({
        registry: "http://registry.npmjs.org"
    }, function (err) {
        if (err) {
            throw err;
        }
        npm.install(modules);

    });

    return browserify({
        require: modules
    }).bundle();
}

exports.getBundle = function (modules) {
    modules = modules.sort();
    if ( !modules.some(function (m) {
        return -~m.search("/");
    }) ) {
        //Insert couch-based cache-ing here.
        return buildBundle(modules);
    } else {
        throw new Error("Your browserified npm modules need to be on npm!");
    }
}

exports.getQuery = function (url) {
    var splitted = url.split("?");

    // No question mark, assume no qs
    if (splitted.length === 1) {
        return null;
    }

    var parsed = qs.parse(splitted.slice(1).join("?"));

    Object.keys(parsed).forEach(function(k) {
        if ( typeof(parsed[k]) === "string" ) {
            try {
                parsed[k] = JSON.parse(parsed[k]);
            } catch (e) {
                // I don't actually care.
                return;
            }
        }
    });

    return parsed;
}
