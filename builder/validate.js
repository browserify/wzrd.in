module.exports = function(pkg) {
  var errors = [];
  if (!pkg.module) {
    errors.push('Missing module');
  }
  if (!pkg.version) {
    errors.push('Missing version');
  }

  //
  // Optional:
  // * subfile
  // * standalone
  // * __core__ (detected to be a core module)

};
