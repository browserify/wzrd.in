var basic = require('basic')

module.exports = function (app, bundle) {
  app.get('/admin/cull/:module', handle)

  var user = process.env['CDN_ADMIN_USER']
  var pass = process.env['CDN_ADMIN_PASS']

  var auth = basic(function (u, p, callback) {
    if (user === u && pass === p) return callback(null)
    callback(401)
  })

  function handle(req, res) {
    res.setHeader('content-type', 'application/json')
    
    if (!user || !pass) {
      res.statusCode = 401
      return res.end(JSON.stringify({error: 'Unauthorized'}))
    }
    auth(req, res, function(err) {
      if (err) {
        res.statusCode = 401
        res.setHeader("WWW-Authenticate", "Basic realm=\"Secure Area\"")
        return res.end(JSON.stringify({error: 'Unauthorized'}))
      }
      return cull(req, res)
    })
  }
  
  function cull(req, res) {
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
