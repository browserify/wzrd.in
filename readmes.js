var readmeGetter = require('readme-getter');

module.exports = function (app, bundle) {

  app.get('/readme/:module', readmeServer);

};

function readmeServer (req, res){

  res.header("Access-Control-Allow-Origin", "*");
  var module = req.params.module;
  if(module){

    //Returns readme HTML from NPM, needs CSS to be defined externally.
    readmeGetter(module, res);
    
  }else{
    res.write.head
  }

}