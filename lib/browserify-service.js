require("colors");

var browserify = require("browserify");
var npm = require("npm");
var request = require("request");
var qs = require("qs");
var winston = require("winston");

//The config file.
var db = JSON.parse(require("fs").readFileSync(__dirname + "/../config.json").toString()).couch;
winston.info("Using database ".yellow + db.cyan);

//Converts a list to an id used with couch.
var list2Id = function(m) {
    return m.join(",");
}

//Builds bundles with browserify.
var buildBundle = function (modules) {
    npm.load({
        registry: "http://registry.npmjs.org"
    }, function (err) {
        if (err) {
            throw err;
        }
        // This was a naive approach late at night.
        // I need to make sure this isn't a bad idea.
        npm.install(modules);

    });

    winston.info("Building ".yellow + ("\""+list2Id(modules)+"\"").cyan + "...".yellow);
    return browserify({
        require: modules
    }).bundle();

}

//handles cacheing with couchdb.
var cached = function (modules, build, cb) {

    //For a consistent order since we're interested
    //in combinations, not permutations.
    modules = modules.sort();
    var url = db + list2Id(modules);

    winston.info("Checking cache for ".yellow + ("\""+list2Id(modules)+"\"").cyan + "...".yellow);

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
            winston.info("Found ".yellow + ("\""+list2Id(modules)+"\"").cyan );
        } else {
            console.log("Missing ".yellow +("\""+list2Id(modules)+"\"").cyan );
        }

        //use the build cb to build the js if necessary
        var js = body.js || build(modules);
        cb(null, js);

        //Try to put the new js into the couch.
        winston.info("Updating document ".yellow + ("\""+list2Id(modules)+"\"").cyan+"...".yellow);
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
                winston.warning("Updating document ".yellow + ("\""+modules.join(",")+"\"").cyan + "failed".red+": ".yellow);
                winston.warning(error);
            } else {
                winston.info("Updated document ".yellow + ("\""+modules.join(",")+"\"").cyan);
            }                
        });
    });
}

exports.getBundle = function (modules, cb) {
    if ( !modules.some(function (m) {
        //Filters out path names.
        // Idea: Replace with npm search
        return -~m.search("/");
    }) ) {
        //Checks for couch caching.
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
