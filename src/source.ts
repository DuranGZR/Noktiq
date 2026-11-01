import { parse as parseJS } from '@babel/parser';
import traverseModule, { type NodePath } from '@babel/traverse';
import { parse as parseSFC } from '@vue/compiler-sfc';
import { baseParse, parserOptions, type ElementNode, type RootNode } from '@vue/compiler-dom';
import MagicString from 'magic-string';
import { relative, isAbsolute } from 'node:path';

const traverse = (traverseModule as unknown as { default: typeof traverseModule }).default ?? traverseModule;
type Editor = { kind: 'vite' | 'next'; base?: string };

export function sourceTransform(code: string, id: string, root: string, editor?: Editor) {
  const [filename, query = ''] = id.split('?');
  const params = new URLSearchParams(query);
  const externalTemplate = filename.endsWith('.html') && params.has('vue') && params.get('type') === 'template' && params.has('src');
  if ((query && !externalTemplate) || /[/\\]node_modules[/\\]/.test(filename) || (!externalTemplate && !/\.(vue|[cm]?[jt]sx?)$/.test(filename))) return;
  const file = relative(root, filename).replaceAll('\\', '/');
  if (file.startsWith('../') || isAbsolute(file)) return;
  const output = new MagicString(code);
  const js = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c');
  const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const location = (start: number) => `${file}:${code.slice(0, start).split('\n').length}:${start - code.lastIndexOf('\n', start - 1)}`;
  const editorTarget = editor && { ...editor, file: filename.replaceAll('\\', '/') };
  const metadata = (start: number) => ({ 'data-noktiq-source': location(start), ...(editorTarget ? { 'data-noktiq-editor': JSON.stringify(editorTarget) } : {}) });
  function insert(offset: number, start: number, usage = false) {
    const values = usage ? { 'data-noktiq-usage': location(start), ...(editorTarget ? { 'data-noktiq-usage-editor': JSON.stringify(editorTarget) } : {}) } : metadata(start);
    output.appendLeft(offset, Object.entries(values).map(([key, value]) => ` ${key}="${escape(value)}"`).join(''));
  }
  function template(content: string, base: number) {
    const visit = (node: RootNode | ElementNode) => {
      if (node.type === 1) {
        const usage = node.tag === 'component';
        if ((node.tagType === 0 || usage) && !['template', 'slot'].includes(node.tag) && !node.props.some(p => p.type === 6 && ['data-noktiq-source', 'data-noktiq-usage'].includes(p.name))) insert(base + node.loc.start.offset + 1 + node.tag.length, base + node.loc.start.offset, usage);
      }
      for (const child of node.children) if (child.type === 1) visit(child);
    };
    visit(baseParse(content, parserOptions));
  }
  function script(content: string, base: number, typescript: boolean, jsx: boolean) {
    const ast = parseJS(content, { sourceType: 'module', plugins: [...(jsx ? ['jsx' as const] : []), ...(typescript ? ['typescript' as const] : [])] });
    let reactUsed = false, reactClone = '';
    let helper = '', componentHelper = '', currentInstance = '', helperOffset = 0, hasJSX = false, componentUsed = false;
    const owners: Array<{ path: NodePath; name: string }> = [];
    const renderFlags = (node: any) => {
      const flags: Record<string, boolean> = {render:false,setup:false};
      for (const prop of node.properties) {
        if (prop.type === 'SpreadElement') { flags.render = flags.setup = false; continue; }
        const key = !prop.computed ? prop.key?.name ?? prop.key?.value : undefined;
        if (key === 'render' || key === 'setup') flags[key] = prop.type === 'ObjectMethod' ? prop.kind === 'method' : ['ArrowFunctionExpression','FunctionExpression'].includes(prop.value?.type);
      }
      return flags;
    };
    function importedAPI(path: NodePath, callee: any): { source: string; method: string } | undefined {
      const name = callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' && callee.object.type === 'Identifier' ? callee.object.name : undefined;
      if (!name) return;
      const binding = path.scope.getBinding(name)?.path;
      if (!binding || !binding.parentPath?.isImportDeclaration()) return;
      const source = binding.parentPath.node.source.value;
      if (binding.isImportSpecifier() && callee.type === 'Identifier') {
        const imported = binding.node.imported;
        const method = imported.type === 'Identifier' ? imported.name : imported.value;
        return { source, method };
      }
      if ((binding.isImportNamespaceSpecifier() || binding.isImportDefaultSpecifier()) && callee.type === 'MemberExpression') {
        const method = !callee.computed && callee.property.type === 'Identifier' ? callee.property.name : callee.computed && callee.property.type === 'StringLiteral' ? callee.property.value : undefined;
        if (method) return { source, method };
      }
    }
    const domTag = (name: string) => name !== 'mesh' && (name.includes('-') || !!parserOptions.isNativeTag?.(name));
    let customRenderer = ast.program.body.some(node => node.type === 'ImportDeclaration' && (node.source.value === 'three' || node.source.value.startsWith('three/') || node.source.value.startsWith('@react-three/')));
    // Renderer host objects (mesh, group, etc.) cannot accept HTML data attributes.
    traverse(ast, {
      JSXOpeningElement(path) { const name = path.node.name; if (name.type === 'JSXIdentifier' && /^[a-z]/.test(name.name) && !domTag(name.name)) customRenderer = true; },
      CallExpression(path) { const api = importedAPI(path, path.node.callee), tag = path.node.arguments[0]; if (api?.source === 'react' && api.method === 'createElement' && tag?.type === 'StringLiteral' && !domTag(tag.value)) customRenderer = true; },
    });
    traverse(ast, {
      Program(path) { reactClone = path.scope.generateUidIdentifier('noktiqClone').name; helper = path.scope.generateUidIdentifier('noktiqRender').name; componentHelper = path.scope.generateUidIdentifier('noktiqComponent').name; currentInstance = path.scope.generateUidIdentifier('noktiqInstance').name; helperOffset = path.node.directives.at(-1)?.end ?? path.node.start ?? 0; },
      JSXOpeningElement(path) {
        hasJSX = true;
        if (customRenderer) return;
        const node = path.node;
        if (node.name.type === 'JSXIdentifier' && /^[a-z]/.test(node.name.name) && !node.attributes.some(a => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === 'data-noktiq-source')) insert(base + node.name.end!, base + node.start!);
      },
      CallExpression(path) {
        const node = path.node, api = importedAPI(path, node.callee);
        if (!content.includes('/* noktiq:vue-root */') && api?.source === 'vue' && api.method === 'defineComponent' && node.arguments[0]?.type === 'ObjectExpression' && !path.scope.getProgramParent().getBinding('globalThis')) {
          output.appendLeft(base + node.start!, `${componentHelper}(`); output.appendLeft(base + node.end!, `,${JSON.stringify(renderFlags(node.arguments[0]))})`); componentUsed = true;
        }
        const kind = api?.source === 'react' && api.method === 'createElement' ? 'react' : api?.source === 'vue' && api.method === 'h' ? 'vue' : api?.source === 'vue' && api.method === 'cloneVNode' ? 'vue-clone' : undefined;
        if (kind === 'react' && customRenderer) return;
        if (kind && path.scope.getProgramParent().getBinding('globalThis')) return;
        if (!kind || !node.arguments.length) return;
        const props = node.arguments[1];
        if (props?.type === 'ObjectExpression' && props.properties.some(p => p.type === 'ObjectProperty' && ((p.key.type === 'StringLiteral' && p.key.value === 'data-noktiq-source') || (p.key.type === 'Identifier' && p.key.name === 'data-noktiq-source')))) return;
        const prefix = `${helper}(${content.slice(node.callee.start!, node.callee.end!)},${JSON.stringify(kind)},${js(metadata(base + node.start!))},[`;
        output.overwrite(base + node.start!, base + node.arguments[0].start!, prefix);
        output.overwrite(base + node.end! - 1, base + node.end!, '])');
        renderUsed = true; if (kind === 'react') reactUsed = true;
      },
      ExportDefaultDeclaration(path) {
        if (!content.includes('/* noktiq:vue-root */') && filename.endsWith('.vue') && path.node.declaration.type === 'ObjectExpression' && !path.scope.getProgramParent().getBinding('globalThis')) {
          output.appendLeft(base + path.node.declaration.start!, `${componentHelper}(`); output.appendLeft(base + path.node.declaration.end!, `,${JSON.stringify(renderFlags(path.node.declaration))})`); componentUsed = true;
        }
      },
      FunctionDeclaration(path) { if (path.node.body && path.node.id && /^[A-Z]/.test(path.node.id.name)) owners.push({ path, name: path.node.id.name }); },
      VariableDeclarator(path) {
        const init = path.node.init;
        const api = init?.type === 'CallExpression' ? importedAPI(path, init.callee) : undefined;
        const wrapped = api?.source === 'react' && ['memo', 'forwardRef'].includes(api.method);
        if (path.node.id.type === 'Identifier' && /^[A-Z]/.test(path.node.id.name) && (wrapped || ['ArrowFunctionExpression', 'FunctionExpression'].includes(init?.type ?? ''))) owners.push({ path, name: path.node.id.name });
      },
      ClassDeclaration(path) {
        const api = path.node.superClass && importedAPI(path, path.node.superClass);
        if (path.node.id && api && api.source === 'react' && ['Component', 'PureComponent'].includes(api.method)) owners.push({ path, name: path.node.id.name });
      },
    });
    if (reactUsed) output.appendLeft(base + helperOffset, `\nimport {cloneElement as ${reactClone}} from 'react';\n`);
    if (renderUsed) output.appendLeft(base + helperOffset, `\nfunction ${helper}(factory${typescript ? ': any' : ''},kind${typescript ? ': string' : ''},meta${typescript ? ': any' : ''},args${typescript ? ': any[]' : ''}){if(kind==='vue'||kind==='vue-clone'){const vnode=factory(...args);try{const key=globalThis.Symbol.for('noktiq.element.source');const value=kind==='vue-clone'?args[0]?.[key]:typeof args[0]==='string'?meta:null;if(value){globalThis.Object.defineProperty(vnode,key,{value});}}catch{}return vnode}if(typeof args[0]!=='string')return factory(...args);return ${reactUsed ? `${reactClone}(factory(...args),meta)` : 'factory(...args)'}}\n`);
    if (componentUsed) {
      const any = typescript ? ': any' : '';
      output.appendLeft(base + helperOffset, `\n/* noktiq:vue-root */import {getCurrentInstance as ${currentInstance}} from 'vue';function ${componentHelper}(options${any},flags${any}){try{const copy=(fn${any},wrapped${any})=>{for(const key of globalThis.Reflect.ownKeys(fn))if(!['prototype','arguments','caller'].includes(String(key))){const descriptor=globalThis.Object.getOwnPropertyDescriptor(fn,key);if(descriptor)try{globalThis.Object.defineProperty(wrapped,key,descriptor)}catch{}}return wrapped};const wrap=(fn${any})=>{const rendered=function(${typescript ? 'this: any,' : ''}...args${typescript ? ': any[]' : ''}){const result=fn.apply(this,args);try{const instance=${currentInstance}();if(instance&&instance.render===rendered)globalThis.Object.defineProperty(instance,globalThis.Symbol.for('noktiq.render.root'),{configurable:true,writable:true,value:{render:rendered,type:result?.type,key:result?.key,meta:result?.[globalThis.Symbol.for('noktiq.element.source')]||null}})}catch{}return result};return copy(fn,rendered)};const render=globalThis.Object.getOwnPropertyDescriptor(options,'render');if(flags.render&&render&&typeof render.value==='function')globalThis.Object.defineProperty(options,'render',{...render,value:wrap(render.value)});const setup=globalThis.Object.getOwnPropertyDescriptor(options,'setup');if(flags.setup&&setup&&typeof setup.value==='function'){const fn=setup.value;globalThis.Object.defineProperty(options,'setup',{...setup,value:copy(fn,function(${typescript ? 'this: any,' : ''}...args${typescript ? ': any[]' : ''}){const value=fn.apply(this,args);return typeof value==='function'?wrap(value):value})})}}catch{}return options}\n`);
    }
    const frameworkImport = ast.program.body.some(node => node.type === 'ImportDeclaration' && ['react','vue'].includes(node.source.value));
    if ((hasJSX || frameworkImport) && !content.includes('/* noktiq:owner */')) for (const owner of owners) {
      const statement = owner.path.parentPath?.isProgram() ? owner.path : owner.path.findParent(p => p.parentPath?.isProgram() === true);
      if (!statement || owner.path.getFunctionParent() || owner.path.scope.getProgramParent().getBinding('Object') || owner.path.scope.getProgramParent().getBinding('Symbol')) continue;
      output.appendLeft(base + statement.node.end!, `;/* noktiq:owner */try{Object.defineProperty(${owner.name},Symbol.for('noktiq.component.source'),{value:${js({ file, ...(editorTarget ? { editor: editorTarget } : {}) })}})}catch{}`);
    }
  }
  let renderUsed = false;
  if (externalTemplate) template(code, 0);
  else if (filename.endsWith('.vue')) {
    const { descriptor, errors } = parseSFC(code);
    if (errors.length) return;
    if (descriptor.template && !descriptor.template.src && (!descriptor.template.lang || descriptor.template.lang === 'html')) template(descriptor.template.content, descriptor.template.loc.start.offset);
    for (const block of [descriptor.script, descriptor.scriptSetup]) if (block && !block.src) {
      renderUsed = false;
      script(block.content, block.loc.start.offset, /^(ts|tsx)$/.test(block.lang ?? ''), /^(jsx|tsx)$/.test(block.lang ?? ''));
    }
  } else script(code, 0, /\.[cm]?tsx?$/.test(filename), /\.[cm]?jsx?$/.test(filename) || filename.endsWith('.tsx'));
  if (!output.hasChanged()) return;
  return { code: output.toString(), map: output.generateMap({ hires: true, source: filename }) };
}
