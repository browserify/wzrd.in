var stringifyError = require('./stringify-error');
var registry = require('./bundler/registry');

module.exports = function (app, bundle) {

  app.get('/buildstatus/:module', getBuildStatus.bind(null, bundle));
  app.get('/buildstatus', getAllBuildStatuses.bind(null, bundle));

}

function getBuildStatus (bundle, req, resp) {

  var c = bundle.cache;
  var module = req.params.module;

  var t = req.params.module.split('@'),
      module = t.shift(),
      version;

  if (t.length) {
    version = t.shift();
  }
  else {
    version = 'latest';
  }

  c.aliases.check({ module: module, semver: version }, function resolve(cb) {
    registry.resolve(module, version, cb);
  }, function(err, version){
    if (err) {
      return handleError(resp, err);
    }
    c.buildstatuses.get(module + '@' + version, function(err, value){
      if (err) {
        if (err.name === 'NotFoundError'){
          handleError(resp, module + '@' + version + ' has not been built on Browserify-CDN');
        }else{
          handleError(resp, err);
        }
        return;
      } else {
        resp.end(value);
      }
    });
  });

}

function getAllBuildStatuses (bundle, req, resp) {

  var c = bundle.cache;
  resp.write('[\n');
  var start = true
  c.buildstatuses.getAllStream()
    .on('data', function(data){
      if (!start){
        resp.write(',');
      }else{
        start = false
      }
      resp.write('{"' + data.key + '":' + data.value + '}\n');
    })
    .on('end', function(){
      resp.end(']');
    });
    
}

function handleError(res, err) {
  res.statusCode = 500;
  var message = err.message || String(err);
  res.end(JSON.stringify({
    error: message
  }));
}