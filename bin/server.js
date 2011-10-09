require("colors");

var http = require("http");
static = require("node-static");
var service = require(__dirname + "/../lib/browserify-service");
var winston = require("winston");

//Static fileserver
http.createServer(function (req, res) {
    var query;

    if (query = service.getQuery(req.url)) {

        service.getBundle(query.require, function (err, js) {
            if (err) {
                winston.info("Cache ".yellow + "error".red + ": "+( (err && err.message) || "status code "+resp.statusCode ).cyan);
            }
            res.writeHead(200, {'Content-Type': 'text/javascript'});
            res.end(js);
        });

        function onError(err) {
            res.writeHead(500, {'Content-Type': 'text/plain' });
            winston.error("In getting bundle: ".red + e.message);
            res.end("FLAGRANT ERROR");
        }
    } else {
        var server = new static.Server(__dirname+"/../static/");
        server.serve(req, res);
    }
}).listen(8080);
