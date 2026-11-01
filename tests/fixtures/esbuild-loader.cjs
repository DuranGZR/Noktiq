const { transformSync } = require('esbuild');
module.exports = function(code) {
  const result = transformSync(code, { loader: 'tsx', jsx: 'automatic', sourcefile: this.resourcePath, sourcemap: true });
  this.callback(null, result.code, JSON.parse(result.map));
};
