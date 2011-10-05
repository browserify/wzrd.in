var http = require("http");
static = require('node-static');
var service = require(__dirname + "/../lib/browserify-service");

//Static fileserver
http.createServer(function (req, res) {
    var query;

    if (query = service.getQuery(req.url)) {
        try {
            //TODO: async! This is gonna lock up ALL the requests.
            var js = service.getBundle(query.require);
            res.writeHead(200, {'Content-Type': 'text/javascript'});
            res.end(js);
        } catch (e) {
            res.writeHead(500, {'Content-Type': 'text/plain' });
            res.end(e.message);
        }
    } else {
        var server = new static.Server(__dirname+"/../static/");
        server.serve(req, res);
    }
}).listen(8080);
