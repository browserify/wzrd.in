'use strict';

module.exports = function createCullHandler(bundle, config) {
  return function cullHandler(req, res) {
    const module = req.params.module;
    bundle.cache.aliases.db.del(module, function(err1) {
      bundle.cache.multibundles.db.del(module, function(err2) {
        if (err1 || err2) {
          res.statusCode = 500
          return res.json({ error: 'Error culling cache' });
        }
        res.json({culled: module});
      })
    })
  }
}
