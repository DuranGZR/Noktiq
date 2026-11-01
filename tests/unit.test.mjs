import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { noktiq } from '../dist/vite.js';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { Noktiq as ReactNoktiq } from '../dist/react.js';
import { createSSRApp, h } from 'vue';
import { renderToString as renderVue } from 'vue/server-renderer';
import { Noktiq as VueNoktiq } from '../dist/vue.js';
import { publicReport } from '../scripts/report-paths.mjs';

test('published reports redact native, slash and JSON-escaped roots without changing source lines', () => {
  const root = ['C:', 'Users', 'fixture-user', 'Noktiq'].join('\\');
  const raw = `File: ${root}\\src\\App.vue\n${JSON.stringify({ file: root + '\\src\\App.vue' })}\nSource: ${root.replaceAll('\\', '/')}/src/App.vue:12:7`;
  const output = publicReport(raw, root);
  assert.ok(!output.includes('fixture-user'));
  assert.ok(output.includes('Source: [project]/src/App.vue:12:7'));
  assert.equal(JSON.parse(output.split('\n')[1]).file, '[project]\\src\\App.vue');
  assert.equal(publicReport('Source: src/App.vue:12:7', root), 'Source: src/App.vue:12:7');
  assert.ok(raw.includes('fixture-user'));
});

const result = await build({ entryPoints: ['src/context.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { exportNotes, pageKey, readNotes, writeNotes } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const note = { id: 'one', page: 'http://localhost:3000/home', selector: '#title', tag: 'h1', text: 'Hello', source: 'src/App.tsx:12:5', viewport: { width: 1440, height: 900 }, note: 'Make it smaller' };

test('hash router keys distinguish routes while stripping route parameters', () => {
  assert.equal(pageKey(new URL('https://local.test/app?token=secret#/first?token=private')), 'https://local.test/app#/first');
  assert.equal(pageKey(new URL('https://local.test/app#!/second?token=private')), 'https://local.test/app#!/second');
  assert.equal(pageKey(new URL('https://local.test/app#/first'), false), 'https://local.test/app');
});

test('oversized grouped notes cannot overwrite the last readable saved copy', () => {
  let saved = JSON.stringify([note]);
  const storage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  const target = { ...note, classes: Array.from({ length: 12 }, () => 'x'.repeat(100)) };
  const large = Array.from({ length: 100 }, () => ({ ...note, targets: Array.from({ length: 50 }, () => target) }));
  assert.throws(() => writeNotes(storage, 'key', large), RangeError);
  assert.equal(readNotes(storage, 'key', note.page)[0].note, note.note);
  writeNotes(storage, 'key', [{ ...note, note: 'Updated' }]);
  assert.equal(readNotes(storage, 'key', note.page)[0].note, 'Updated');
});

test('group exports preserve every locator and styles appear only in detailed output', () => {
  const group = { ...note, kind: 'group', targets: [{ ...note, classes: ['shared'], computedStyles: { color: 'rgb(0, 0, 0)' } }, { ...note, selector: '#second', classes: ['shared', 'second'] }] };
  assert.match(exportNotes([group]), /Selector: #second/);
  assert.equal((exportNotes([group]).match(/Requested change:/g) || []).length, 1);
  assert.doesNotMatch(exportNotes([group]), /Computed styles:/);
  assert.match(exportNotes([group], { detail: 'detailed' }), /Computed styles:/);
  assert.doesNotMatch(exportNotes([group], { detail: 'compact' }), /Viewport:/);
  assert.equal(exportNotes([group], { format: 'source' }), note.source);
  assert.equal(exportNotes([group], { format: 'classes' }), 'shared\nsecond');
  assert.match(exportNotes([{ ...group, targets: [note] }]), /group \(1 target\)/);
  assert.equal(exportNotes([{ ...note, source: undefined }], { format: 'source' }), '');
});

test('React and Vue standard output prioritizes exact source without wrapper noise', () => {
  for (const framework of ['react', 'vue']) {
    const target = { ...note, sourceKind: 'element', text: '',
      components: { framework, names: ['LayoutRouter', 'Suspense', 'About', 'SectionReveal', 'motion.div'] },
      componentFile: { file: 'components/animations/SectionReveal.tsx', name: 'SectionReveal' },
      classes: ['w-[120px]', 'h-[120px]', 'rounded-full'],
      identifiers: { 'data-row-id': 'profile' }, ancestors: [{ tag: 'section', identifiers: { id: 'about' } }] };
    const before = JSON.stringify(target);
    for (const detail of ['compact', 'standard']) {
      const text = exportNotes([target], { detail });
      for (const value of [target.source, target.selector, target.page, 'profile', 'about', target.note]) assert.ok(text.includes(value));
      assert.doesNotMatch(text, /components:|Component file:|Source kind:|CSS classes:|Visible text:/);
      assert.match(text, /Apply only the requested changes/);
    }
    const detailed = exportNotes([target], { detail: 'detailed' });
    assert.match(detailed, /components: "LayoutRouter"/);
    assert.match(detailed, /Component file: "components\/animations\/SectionReveal.tsx"/);
    assert.match(detailed, /CSS classes:/);
    assert.equal(JSON.stringify(target), before, 'Copying must not change stored context');
    assert.equal(exportNotes([target], { format: 'classes' }), target.classes.join('\n'));
  }
});

test('fallback context and uncertain source warnings survive simpler exports', () => {
  const target = { ...note, source: undefined, classes: ['payment'], componentFile: { file: 'src/Owner.vue' },
    label: 'Pay now', identifiers: { 'data-row-id': '42' },
    boundaries: [{ kind: 'frame', selector: '#preview', page: 'http://localhost:3000/frame' }, { kind: 'shadow', selector: 'payment-card' }] };
  const text = exportNotes([target]);
  for (const value of ['exact element line unavailable', 'Component file:', 'src/Owner.vue', 'CSS classes: ["payment"]', 'Accessible label: "Pay now"']) assert.ok(text.includes(value));
  for (const detail of ['compact', 'standard', 'detailed']) {
    const group = { ...note, kind: 'group', targets: [target, { ...target, selector: '#second', source: note.source, sourceKind: 'component-usage' }] };
    const output = exportNotes([group], { detail });
    for (const value of ['Boundary path:', 'payment-card', '"data-row-id":"42"', '#second', 'component usage; not the native element definition']) assert.ok(output.includes(value));
    assert.equal((output.match(/Requested change:/g) || []).length, 1);
    assert.match(exportNotes([{ ...note, sourceKind: 'ancestor' }], { detail }), /ancestor element; not the selected element definition/);
    assert.match(exportNotes([{ ...note, sourceKind: 'component' }], { detail }), /component location; exact element line unknown/);
  }
  assert.match(exportNotes([{ ...target, componentFile: undefined }]), /Source: unavailable/);
});

test('selected text and accessible labels are not repeated in any output detail', () => {
  for (const detail of ['compact', 'standard', 'detailed']) {
    const text = exportNotes([{ ...note, selectedText: 'Hello', label: 'Hello', textRange: { start: 0, end: 5 } }], { detail });
    assert.match(text, /Selected text: "Hello"/);
    assert.doesNotMatch(text, /Visible text:|Accessible label:/);
  }
});

test('new stored context rejects invalid boundaries, nested groups and untrusted styles', () => {
  const read = item => readNotes({ getItem: () => JSON.stringify([item]) }, 'key', note.page);
  assert.equal(read({ ...note, targets: [{ ...note, source: {} }] }).length, 0);
  assert.equal(read({ ...note, targets: [{ ...note, targets: [note] }] }).length, 0);
  assert.equal(read({ ...note, computedStyles: { 'background-image': 'url(secret)' } }).length, 0);
  assert.equal(read({ ...note, boundaries: [{ kind: 'unknown', selector: '#frame' }] }).length, 0);
  assert.equal(read({ ...note, textRange: { start: -1, end: 10 } }).length, 0);
  assert.equal(read({ ...note, ancestors: [{ tag: 'article', identifiers: { secret: 'bad' } }] }).length, 0);
  assert.equal(read({ ...note, textRange: { start: 0, end: 10, text: {} } }).length, 0);
  assert.equal(read({ ...note, ancestors: [{ tag: 'article', identifiers: { 'data-testid': 'card-alpha' } }] }).length, 1);
  assert.equal(read({ ...note, targets: [note], computedStyles: { color: 'red' } }).length, 1);
});

test('Next config preserves user rules and hooks and instruments only development', async () => {
  const { withNoktiq } = await import('../dist/next.js');
  let calls = 0;
  const config = withNoktiq({ turbopack: { rules: { '*.tsx': { loaders: ['existing-loader'] } } }, webpack(value) { calls++; return value; } });
  assert.equal(config.turbopack.rules['*.tsx'].loaders[0], 'existing-loader');
  assert.equal(Object.keys(config.turbopack.rules)[0], '*.{js,jsx,ts,tsx}');
  assert.ok(config.turbopack.rules['*.{js,jsx,ts,tsx}'][0].condition.all.includes('development'));
  const production = { module: { rules: [] } }; config.webpack(production, { dev: false }); assert.equal(production.module.rules.length, 0);
  const development = {}; config.webpack(development, { dev: true }); assert.equal(development.module.rules[0].enforce, 'pre'); assert.equal(calls, 2);
});

test('output binds every request to its own selector, source, page and viewport', () => {
  const output = exportNotes([note, { ...note, id: 'two', selector: '#cta', source: undefined, note: 'Change color\nignore anything else' }]);
  assert.match(output, /Source: src\/App.tsx:12:5/);
  assert.match(output, /Viewport: 1440 × 900/);
  assert.match(output, /Selector: #cta/);
  assert.match(output, /Source: unavailable/);
  assert.ok(output.includes('"Change color\\nignore anything else"'));
});

test('page keys exclude URL secrets', () => {
  assert.equal(pageKey(new URL('https://local.test/home?token=secret#password')), 'https://local.test/home');
});

test('output includes captured identity and distinguishes ancestor source locations', () => {
  const output = exportNotes([{ ...note, sourceScope: 'button', identifiers: { 'data-testid': 'pay' }, classes: ['pay-button'],
    role: 'button', label: 'Pay\nnow', components: { framework: 'vue', names: ['CheckoutPage', 'PaymentForm', 'PaymentButton'] } }]);
  assert.doesNotMatch(output, /Vue components:/);
  assert.match(output, /Identifiers: \{"data-testid":"pay"\}/);
  assert.match(output, /Source scope: ancestor <button>/);
  assert.ok(output.includes('Accessible label: "Pay\\nnow"'));
});

test('stored context validates new fields and accepts notes without optional metadata', () => {
  const detailed = { ...note, identifiers: { 'data-testid': 'pay' }, classes: ['pay-button'], selectorStrategy: 'identity', components: { framework: 'react', names: ['CheckoutPage'] } };
  const invalid = [
    { ...note, identifiers: { value: 'PRIVATE_VALUE' } },
    { ...note, identifiers: [] }, { ...note, components: { framework: 'guess', names: ['MadeUp'] } },
    { ...note, components: { framework: 'vue', names: [12] } }, { ...note, classes: 'pay' },
    { ...note, selectorStrategy: 'guess' }, { ...note, label: 'x'.repeat(241) },
  ];
  assert.deepEqual(readNotes({ getItem: () => JSON.stringify([note, detailed, ...invalid]) }, 'key', note.page), [note, detailed]);
});

test('corrupt, oversized, wrong-page and inaccessible storage fail safely', () => {
  const storage = value => ({ getItem: () => value });
  assert.deepEqual(readNotes(storage(JSON.stringify([note, { ...note, note: 12 }, { ...note, page: '/wrong' }, { ...note, viewport: null }])), 'key', note.page), [note]);
  assert.deepEqual(readNotes(storage('{bad'), 'key', note.page), []);
  assert.deepEqual(readNotes(storage('a'.repeat(1_000_001)), 'key', note.page), []);
  assert.deepEqual(readNotes({ getItem() { throw new Error('denied'); } }, 'key', note.page), []);
});

test('React and Vue wrappers import and render on the server without touching DOM', async () => {
  assert.equal(renderToString(createElement(ReactNoktiq, { enabled: true })), '');
  assert.equal(await renderVue(createSSRApp({ render: () => h(VueNoktiq, { enabled: true }) })), '<!---->');
});

test('pin anchors validate relative coordinates while retaining existing notes', () => {
  const anchored = { ...note, anchor: { x: .2, y: .75 } };
  const storage = { getItem: () => JSON.stringify([note, anchored, { ...note, anchor: { x: -1, y: .5 } }, { ...note, anchor: { x: .5, y: 2 } }, { ...note, anchor: null }]) };
  assert.deepEqual(readNotes(storage, 'key', note.page), [note, anchored]);
});

function transform(code, file) {
  const plugin = noktiq();
  plugin.configResolved({ root: process.cwd() });
  return plugin.transform.call({ warn(message) { throw new Error(message); } }, code, `${process.cwd()}/${file}`);
}

test('React source instrumentation points to original JSX lines and skips components', () => {
  const transformed = transform('const x = <Widget>\n  <button id="go">Go</button>\n</Widget>;', 'src/App.tsx');
  assert.match(transformed.code, /<button data-noktiq-source="src\/App.tsx:2:3"/);
  assert.doesNotMatch(transformed.code, /<Widget data-noktiq/);
  assert.ok(transformed.map);
});

test('Vue instrumentation uses original SFC lines with directives and nested nodes', () => {
  const transformed = transform('<script setup>const x = 1</script>\n<template>\n  <main><button v-if="x">Go</button></main>\n</template>', 'src/App.vue');
  assert.match(transformed.code, /<main data-noktiq-source="src\/App.vue:3:3"/);
  assert.match(transformed.code, /<button data-noktiq-source="src\/App.vue:3:9"[^>]* v-if/);
});

test('source plugin is development-only and does not double-instrument', () => {
  assert.equal(noktiq().apply, 'serve');
  assert.equal(transform('const x = <button data-noktiq-source="custom">Go</button>', 'src/App.jsx'), undefined);
  assert.equal(transform('export const x = 1', 'src/util.ts'), undefined);
});

const editorBundle = await build({ entryPoints: ['src/editor.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { parseSource, validEditor, editorURL } = await import(`data:text/javascript;base64,${Buffer.from(editorBundle.outputFiles[0].text).toString('base64')}`);
test('editor links preserve Windows paths, line and column without changing origin', () => {
  assert.deepEqual(parseSource('C:/work/src/App.tsx:12:7'), { file: 'C:/work/src/App.tsx', line: 12, column: 7 });
  assert.equal(parseSource('src/App.tsx:0:1'), undefined);
  assert.equal(parseSource('src/App.tsx:999999999999999999:1'), undefined);
  assert.equal(validEditor({ kind: 'vite', file: 'https://outside.test/x' }), false);
  assert.equal(validEditor({ kind: 'vite', file: '/work/app.tsx', base: '//outside.test' }), false);
  const url = editorURL({ kind:'next', file:'C:/work/src/App.tsx', base:'/dashboard' }, 'src/App.tsx:12:7', 'http://localhost:3000/');
  assert.equal(url.origin, 'http://localhost:3000'); assert.equal(url.pathname, '/dashboard/__nextjs_launch-editor');
  assert.equal(url.searchParams.get('file'), 'C:/work/src/App.tsx'); assert.equal(url.searchParams.get('line1'), '12'); assert.equal(url.searchParams.get('column1'), '7');
});
test('local editor file metadata is not included in copied AI requests', () => {
  assert.doesNotMatch(exportNotes([{ ...note, editor: { kind:'vite', file:'/private/local/work/src/App.tsx' } }], { detail:'detailed' }), /private\/local/);
});


test('imported render helpers are bound lexically and local shadows are never instrumented', () => {
  const input = "import {createElement as ce} from 'react'; export const Actual=()=>ce('button',{id:'actual'}); function local(ce){return ce('button',{id:'shadow'})}";
  const code = transform(input, 'src/Render.ts').code;
  assert.equal((code.match(/"data-noktiq-source":/g) || []).length, 1);
  assert.ok(code.includes("return ce('button',{id:'shadow'})"));
  assert.equal(transform(code, 'src/Render.ts'), undefined);
});
test('Vue dynamic usage does not copy or evaluate its is expression', () => {
  const code = transform('<template><component :is="getTag()">Dynamic</component></template>', 'src/Dynamic.vue').code;
  assert.equal((code.match(/getTag\(\)/g) || []).length, 1);
  assert.ok(code.includes('data-noktiq-usage="src/Dynamic.vue:1:11"'));
  assert.doesNotMatch(code, /data-noktiq-source=/);
});
test('external Vue HTML templates retain their own file coordinates', () => {
  const code = transform('<button>External</button>', 'src/button.html?vue&type=template&src=true').code;
  assert.ok(code.includes('data-noktiq-source="src/button.html:1:1"'));
  assert.equal(transform('<button>Raw</button>', 'src/button.html?raw'), undefined);
});
test('source-first output distinguishes an owner file from an exact source location', () => {
  const precise = exportNotes([note]);
  assert.ok(precise.indexOf('Source:') < precise.indexOf('Selector:'));
  const fallback = { ...note, source: undefined, sourceKind:'component', componentFile: { file:'src/Owner.vue', name:'Owner' } };
  assert.match(exportNotes([fallback]), /exact element line unavailable/);
  assert.match(exportNotes([fallback]), /Component file: "src\/Owner.vue"/);
  assert.equal(exportNotes([fallback], { format:'source' }), 'src/Owner.vue');
  const usage = exportNotes([{ ...note, sourceKind:'component-usage' }]);
  assert.match(usage, /component usage; not the native element definition/);
});


test('generated Vue script metadata cannot terminate its script block', () => {
  const code = transform("<script>import {h} from 'vue';export default {render(){return h('button','Text')}}</script>", 'src/</script>/Odd.vue').code;
  assert.equal((code.match(/<\/script>/g) || []).length, 1);
  const encoded = /"data-noktiq-source":("(?:[^"\\]|\\.)*")/.exec(code)[1];
  assert.ok(JSON.parse(encoded).includes('</script>/Odd.vue:'));
});
test('component owner metadata recognizes real React wrappers and classes only', () => {
  const code = transform("import {Component,memo as wrap} from 'react';class Real extends Component{};const Wrapped=wrap(()=>null);class Other{}", 'src/Owners.ts').code;
  assert.match(code, /defineProperty\(Real,/); assert.match(code, /defineProperty\(Wrapped,/); assert.doesNotMatch(code, /defineProperty\(Other,/);
});


test('Vue render provenance remains idempotent and avoids wrapping borrowed callbacks', () => {
  const input = "<script>import {h,defineComponent} from 'vue';export default defineComponent({setup(props,{expose}){expose({});return ()=>h('button','Root')}})</script>";
  const code=transform(input,'src/Setup.vue').code;
  assert.equal(transform(code,'src/Setup.vue'),undefined);
  assert.match(code, /"setup":true/);
  const borrowed=transform("import {h,defineComponent} from 'vue';const setup=()=>()=>h('button');export default defineComponent({setup})",'src/Borrowed.js').code;
  assert.match(borrowed, /"setup":false/);
});

test('React render instrumentation preserves frozen config, hidden keys and getter receivers',async()=>{
  const {createRequire}=await import('node:module');const {Script}=await import('node:vm');
  const input="import {createElement as ce} from 'react';let reads=0;const config={get title(){if(this!==config)throw new Error('getter receiver');reads++;return 'title'}};Object.defineProperty(config,'key',{value:'hidden-key'});Object.freeze(config);export const result=ce('button',config,'Text');export {reads};";
  const compiled=await build({stdin:{contents:transform(input,'src/Config.js').code,resolveDir:process.cwd()},bundle:true,packages:'external',format:'cjs',platform:'node',write:false});
  const module={exports:{}};new Script(compiled.outputFiles[0].text).runInNewContext({require:createRequire(import.meta.url),module,exports:module.exports});
  assert.equal(module.exports.result.key,'hidden-key');assert.equal(module.exports.result.props.title,'title');assert.equal(module.exports.reads,1);
  assert.ok(module.exports.result.props['data-noktiq-source']);
});

test('legacy Turbopack TSX conversion preserves JSX and maps back to original source',async()=>{
  const {createRequire,SourceMap}=await import('node:module');const {resolve}=await import('node:path');
  const require=createRequire(import.meta.url);const loader=require('../dist/webpack-loader.cjs');
  const code="import {createElement} from 'react';\nexport function Example(){const label:string='typed';return <button>{label}</button>}";
  const transformed=await new Promise((done,reject)=>loader.call({resourcePath:resolve('tests/fixtures/legacy.tsx'),rootContext:process.cwd(),mode:'development',getOptions:()=>({root:process.cwd(),transpileTypescript:true}),callback:(error,output,map)=>error?reject(error):done({output,map}),emitWarning:error=>{throw error}},code));
  assert.ok(transformed.output.includes('<button'));assert.ok(!transformed.output.includes('label:string'));
  const position=transformed.output.indexOf('<button');const lines=transformed.output.slice(0,position).split('\n');
  const entry=new SourceMap(transformed.map).findEntry(lines.length-1,lines.at(-1).length);
  assert.equal(entry.originalLine,1);assert.equal(entry.originalColumn,code.split('\n')[1].indexOf('<button'));
  assert.ok(entry.originalSource.endsWith('tests/fixtures/legacy.tsx'));
});

test('Vite source root can cover a framework app directory',async()=>{
  const {resolve}=await import('node:path');const plugin=noktiq({root:process.cwd()});
  plugin.configResolved({root:resolve('tests/fixtures/app'),base:'/'});
  const result=plugin.transform.call({warn:error=>{throw new Error(error)}},'const node=<button/>',resolve('tests/fixtures/app/App.jsx'));
  assert.ok(result.code.includes('tests/fixtures/app/App.jsx:1:12'));
});

test('legacy TSX conversion preserves imports requested by the project tsconfig',async()=>{
  const {createRequire}=await import('node:module');const {resolve}=await import('node:path');const {mkdir,writeFile}=await import('node:fs/promises');
  const directory=resolve('.local-validation/tsx-config');await mkdir(directory,{recursive:true});await writeFile(resolve(directory,'tsconfig.json'),JSON.stringify({compilerOptions:{verbatimModuleSyntax:true}}));
  const loader=createRequire(import.meta.url)('../dist/webpack-loader.cjs');
  const output=await new Promise((done,reject)=>loader.call({resourcePath:resolve(directory,'Example.tsx'),rootContext:process.cwd(),mode:'development',getOptions:()=>({root:process.cwd(),transpileTypescript:true}),callback:(error,code)=>error?reject(error):done(code),emitWarning:error=>{throw error}},"import {sideEffect} from './setup';export const node=<button/>"));
  assert.match(output,/import \{ sideEffect \} from ['"]\.\/setup['"]/);
});

test('custom renderer hosts retain owner hints without receiving DOM source attributes',()=>{
  for(const input of [
    "import {Canvas} from '@react-three/fiber';export const Scene=()=> <Canvas><mesh/><line/></Canvas>",
    "export function Mesh(){return <mesh><boxGeometry/></mesh>}",
    "import {createElement} from 'react';export function Mesh(){return createElement('mesh')}"
  ]){const code=transform(input,'src/Scene.jsx').code;assert.doesNotMatch(code,/data-noktiq-source/);assert.match(code,/noktiq.component.source/);}
  assert.match(transform("export const Button=()=> <button/>",'src/Button.jsx').code,/data-noktiq-source/);
});


test('Vue kebab-case components and router links never override native child source metadata', () => {
  const code = transform('<template><child-card/><ChildCard/><router-link/><button>Native</button><svg><path /></svg></template>', 'src/Kebab.vue').code;
  assert.doesNotMatch(code, /<(?:child-card|ChildCard|router-link) data-noktiq-source/);
  assert.match(code, /<button data-noktiq-source=/);
  assert.match(code, /<path data-noktiq-source=/);
});

test('shared Next integration resolves the application version rather than its own peer installation', async () => {
  const { withNoktiq } = await import('../dist/next.js');
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
  const { resolve, join, dirname } = await import('node:path');
  await mkdir(resolve('.local-validation'), { recursive: true });
  const original = process.cwd(), temporary = await mkdtemp(resolve('.local-validation/next-resolution-'));
  try {
    for(const version of ['14.2.35','15.2.9','15.5.28','16.4.3']) {
      const cwd=join(temporary,version);await mkdir(join(cwd,'node_modules/next'),{recursive:true});
      await writeFile(join(cwd,'package.json'),'{}');await writeFile(join(cwd,'node_modules/next/package.json'),JSON.stringify({version}));
      process.chdir(cwd);const config=withNoktiq();
      if(version.startsWith('14.')||version.startsWith('15.2.')) { assert.ok(config.experimental.turbo);assert.equal(config.turbopack,undefined); }
      else assert.ok(config.turbopack);
    }
  } finally { process.chdir(original);assert.equal(dirname(temporary),resolve('.local-validation'));await rm(temporary,{recursive:true,force:true}); }
});
