exports.getBundle = function (requires) {
    return browserify({
        require: requires
    }).bundle();
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
