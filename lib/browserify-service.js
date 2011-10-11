require("colors");

var browserify = require("browserify");
var npm = require("npm");
var request = require("request");
var qs = require("qs");
var winston = require("winston");
var crypto = require("crypto");

//The config file.
var db = JSON.parse(require("fs").readFileSync(__dirname + "/../config.json").toString()).couch;
winston.info("Using database ".yellow + db.cyan);

//Converts a list to an id used with couch.
var list2Id = function(m) {
    //You can see we went for simple. ;)
    return crypto.createHash('sha1').update(JSON.stringify(m)).digest("base64"); }

//Builds bundles with browserify.
var buildBundle = function (modules, cb) {
    if (!cb) { throw new Error("Why the Hell doesn't this have a callback?") }
    npm.load({
        registry: "http://registry.npmjs.org"
    }, function (err) {
        if (err) {
            throw err;
        }

        var cleaned = modules.map(function(m) {
            return (typeof m === "string")
              ? m
              : m[Object.keys(m)[0]];
        });

        //Let's see if npm has it installed...
        var bundle;
        try {
            //The easy case.
            bundle = browserify({
                require: modules
            }).bundle();
            winston.info("HUGE SUCCESS ".green + ("\""+list2Id(modules)+"\"").cyan + "...".yellow);
            cb(null, bundle);

        } catch (e) {
            winston.warn("Failed".red + " to build ".yellow + ("\""+list2Id(modules)+"\"").cyan + ": ".yellow + e.message);
            winston.warn("Attempting to install ".yellow + JSON.stringify(cleaned).cyan + "...".yellow);
            //Better hit up npm
            npm.install(cleaned, function (err) {
                if (err) {
                    winston.warn("npm errors: "+cb);
                }
                winston.info("Successfully installed ".yellow + ("\""+list2Id(modules)+"\"").cyan + "...".yellow);
                try {
                    winston.info("Attempting to build ".yellow +  list2Id(modules).cyan + " again...".yellow);
                    bundle = browserify({
                         require: modules
                    }).bundle();
                    winston.info("HUGE SUCCESS ".green + list2Id(modules).cyan + "...".yellow);
                    cb(null, bundle);
                } catch (e) {
                    //flagrant
                    cb(e);
                }
            });
        }
    });
}

//handles cacheing with couchdb.
var cached = function (modules, build, cb) {

    //For a consistent order since we're interested
    //in combinations, not permutations.
    modules = modules.sort();
    var url = db + list2Id(modules);

    winston.info("Checking cache for ".yellow + list2Id(modules).cyan + "...".yellow);

    request({
      uri: url
    }, function (err, resp, body) {

        //Couchdb error
        if (err || (resp.statusCode != 200 && resp.statusCode != 404)) {
            

            cb(err || new Error("Couchdb get status code "+resp.statusCode));
        }

        body = JSON.parse(body);

        //not found case is kosher
        if (body.error && body.error !== "not_found") {
            cb(new Error("Couchdb error: "+body.reason));
        }

        if (body.js) {
            winston.info("Found ".yellow + list2Id(modules).cyan );
        } else {
            console.log("Missing ".yellow + list2Id(modules).cyan );
        }

        //use the build cb to build the js if necessary
        if (body.js) {
            cb(null, body.js);
        } else {
            build(modules, function (err, js) {
                if (!err && js ) {
                    cb(null, js);
                    //Try to put the new js into the couch.
                    winston.info("Updating document ".yellow + ("\""+list2Id(modules)+"\"").cyan+"...".yellow);

                    try {
                    // TODO: There is an error in here SO FLAGRANT that it escapes tries.
                        request.put({
                            uri: url,
                            json: {
                              _id: body._id,
                              _rev: body._rev,
                              js: js
                            }
                        }, function (err, resp, body) {

                            //This part just does some error handling.
                            var error = ( err
                             || (resp.statusCode !== 201 ? body : undefined)
                             || (body.error ? new Error("Error: ") + body.reason : undefined));
                            if (error) {
                                winston.warning("Updating document ".yellow + JSON.stringify(modules).cyan + "failed".red+": ".yellow);
                                winston.warning(error);
                            } else {
                                winston.info("Updated document ".yellow + JSON.stringify(modules).cyan);
                            }                
                        });
                    } catch (e) {
                        cb(e);
                    }
                }
            });
        }
    });
}

exports.getBundle = function (modules, cb) {
    if ( !modules.some(function (m) {
        //Filters out path names.
        // Idea: Replace with npm search
        return m.search
           ? -~m.search("/")
           : -~m[Object.keys(m)[0]].search("/");
    }) ) {
        //Checks for couch caching.
        winston.info("Requested: ".yellow + JSON.stringify(modules).cyan);
        cached(modules, buildBundle, cb);
    } else {
        cb(new Error("Your browserified npm modules need to be on npm!"));
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
