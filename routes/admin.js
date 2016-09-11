var auth = require('../middlewares/auth')

module.exports = function (app, bundle) {
  app.get('/admin/cull/:module', auth(bundle.config), handle)

  function handle(req, res) {
    var module = req.params.module
    bundle.cache.aliases.db.del(module, function(err1) {
      bundle.cache.multibundles.db.del(module, function(err2) {
        if (err1 || err2) {
          res.statusCode = 500
          return res.end(JSON.stringify({error: 'Error culling cache'}))
        }
        res.end(JSON.stringify({culled: module}))
      })
    })
  }
}
