const { sourceTransform } = require('./source.cjs');

module.exports = function noktiqSource(code, inputMap) {
  this.cacheable?.();
  if (this.mode ? this.mode === 'production' : process.env.NODE_ENV === 'production') {
    this.callback(null, code, inputMap);
    return;
  }
  try {
    const options = this.getOptions?.() || {};
    const result = sourceTransform(code, this.resourcePath, options.root || this.rootContext, options.editor);
    if (options.transpileTypescript && /\.tsx$/.test(this.resourcePath)) {
      // Older Turbopack parses loader output as JS. Preserve JSX and compose maps back to the original TSX.
      const ts = require('node:module').createRequire(this.resourcePath)('typescript');
      const directory = require('node:path').dirname(this.resourcePath);
      const configPath = ts.findConfigFile(directory, ts.sys.fileExists);
      const config = configPath ? ts.readConfigFile(configPath, ts.sys.readFile).config : {};
      const compiler = ts.parseJsonConfigFileContent(config || {}, { ...ts.sys, readDirectory: () => [] }, configPath ? require('node:path').dirname(configPath) : directory).options;
      const compiled = ts.transpileModule(result?.code || code, { fileName: this.resourcePath, compilerOptions: {
        ...compiler, noEmit: false, emitDeclarationOnly: false, declaration: false, rewriteRelativeImportExtensions: false,
        target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, sourceMap: true, inlineSources: true,
      } });
      const original = result ? JSON.parse(result.map.toString()) : inputMap;
      if (result) original.sourcesContent = [code];
      const map = original ? require('@jridgewell/remapping')([JSON.parse(compiled.sourceMapText), original], () => null) : JSON.parse(compiled.sourceMapText);
      this.callback(null, compiled.outputText, map);
      return;
    }
    this.callback(null, result?.code || code, result ? JSON.parse(result.map.toString()) : inputMap);
  } catch (error) {
    this.emitWarning?.(new Error(`Noktiq source metadata: ${error.message}`));
    this.callback(null, code, inputMap);
  }
};
