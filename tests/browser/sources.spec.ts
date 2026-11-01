import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
test.beforeEach(async ({page})=>{ await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Capture source-first output')}}})); });
async function capture(page:Page, selector:string, note:string) {
  await page.getByRole('button',{name:'Open Noktiq',exact:true}).click();
  await page.locator(selector).first().click({position:{x:4,y:4}});
  await page.getByRole('textbox',{name:'What should change?'}).fill(note); await page.getByRole('button',{name:'Save note',exact:true}).click();
  await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
  const saved = await page.evaluate(()=>JSON.parse(localStorage.getItem(`noktiq:v1:${location.origin}${location.pathname}`)!)[0]);
  await page.getByRole('button',{name:'Copy',exact:true}).click();
  const markdown=await page.getByRole('textbox',{name:'Output for your coding agent'}).inputValue();
  expect(markdown.indexOf('Source:')).toBeLessThan(markdown.indexOf('Selector:'));
  await test.info().attach('source-discovery.md',{body:markdown,contentType:'text/markdown'});
  return saved;
}
async function verifySource(framework:string, source:string, start:RegExp) {
  const match=/^(.+):(\d+):(\d+)$/.exec(source)!; expect(match).not.toBeNull();
  const file=resolve(`examples/${framework}`,match[1]);expect(file.startsWith(resolve(`examples/${framework}`))).toBeTruthy();
  const text=await readFile(file,'utf8');expect(text.split('\n')[Number(match[2])-1].slice(Number(match[3])-1)).toMatch(start);
}
test('React imported createElement maps to its native creation call, not the component invocation',async({page})=>{
  await page.goto('http://127.0.0.1:5173/source.html');await page.locator('#factory-button').first().waitFor();
  const saved=await capture(page,'#factory-button','Factory source'); expect(saved.sourceKind).toBe('element');await verifySource('react',saved.source,/^element\('button'/);
  expect(saved.componentFile.file).toBe('source-main.tsx');
});
test('React dynamic types are evaluated once and retain precise native source',async({page})=>{
  await page.goto('http://127.0.0.1:5173/source.html');await page.locator('#dynamic-factory').waitFor();
  expect(await page.evaluate(()=>(window as any).factoryReads)).toBe(1);
  const saved=await capture(page,'#dynamic-factory','Dynamic factory source');await verifySource('react',saved.source,/^element\(getTag\(\)/);
  expect(await page.evaluate(()=>(window as any).factoryReads)).toBe(1);
});
for(const id of ['memo-file-only','ref-file-only']) test(`React ${id} falls back to its actual component file without inventing a line`,async({page})=>{
  await page.goto('http://127.0.0.1:5173/source.html');await page.locator(`#${id}`).waitFor();
  const saved=await capture(page,`#${id}`,'Component file fallback');expect(saved.source).toBeUndefined();expect(saved.sourceKind).toBe('component');expect(saved.componentFile.file).toBe('source-main.tsx');
  await page.getByRole('button',{name:'Show notes',exact:true}).click();await expect(page.locator('noktiq-toolbar .source-kind')).toContainText('Exact line unknown');
});
test('React fragments retain their native child location',async({page})=>{
  await page.goto('http://127.0.0.1:5173/source.html'); const saved=await capture(page,'#fragment-factory','Fragment source');await verifySource('react',saved.source,/^element\('button'/);expect(saved.sourceKind).toBe('element');
});
for(const [index,text]of [[0,'Vue h props'],[1,'Vue h text'],[2,'Vue h array'],[3,'Vue h VNode'],[4,'Vue h dynamic native']] as const) test(`Vue render overload preserves ${text} and maps its own call`,async({page})=>{
  await page.goto('http://127.0.0.1:5174/source.html');await page.locator('#vue-render-root').waitFor();await expect(page.locator('#vue-render-root > button').nth(index)).toHaveText(text);
  await page.getByRole('button',{name:'Open Noktiq',exact:true}).click();await page.locator('#vue-render-root > button').nth(index).click({position:{x:4,y:4}});
  await page.getByRole('textbox',{name:'What should change?'}).fill(text);await page.getByRole('button',{name:'Save note',exact:true}).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(`noktiq:v1:${location.origin}${location.pathname}`)!)[0]);expect(saved.sourceKind).toBe('element');await verifySource('vue',saved.source,/^node\(/);
});
test('Vue dynamic template exposes its usage line and never evaluates is twice',async({page})=>{
  await page.goto('http://127.0.0.1:5174/source.html');await page.locator('#vue-template-dynamic').waitFor();expect(await page.evaluate(()=>(window as any).componentTagReads)).toBe(1);
  await page.locator('#vue-template-dynamic').evaluate(el=>el.removeAttribute('id'));
  const saved=await capture(page,'[data-noktiq-usage]','Dynamic template');expect(saved.sourceKind).toBe('component-usage');await verifySource('vue',saved.source,/^<component\b/);expect(await page.evaluate(()=>(window as any).componentTagReads)).toBe(1);
  expect(saved.identifiers).toBeUndefined();await page.reload();await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
});
test('Vue external HTML template points to the HTML file rather than the SFC wrapper',async({page})=>{
  await page.goto('http://127.0.0.1:5174/source.html');const saved=await capture(page,'#vue-external-template','External source');expect(saved.source).toMatch(/^source-external\.html:/);await verifySource('vue',saved.source,/^<button\b/);
});
test('Vue unknown factories still identify the real owning component file',async({page})=>{
  await page.goto('http://127.0.0.1:5174/source.html');const saved=await capture(page,'#vue-file-only','Vue file fallback');expect(saved.source).toBeUndefined();expect(saved.sourceKind).toBe('component');expect(saved.componentFile.file).toMatch(/SourceFileOnly\.vue$/);
});
test('Vue render instrumentation keeps the original props reference and survives source-only relocation',async({page})=>{
  await page.goto('http://127.0.0.1:5174/source.html');await expect(page.locator('#vue-props-after')).toHaveText('Vue original props reference');await expect(page.locator('#vue-props-before')).toHaveCount(0);
  await page.locator('#vue-props-after').evaluate(el=>el.removeAttribute('id'));
  const saved=await capture(page,'#vue-render-root > button:nth-child(6)','Preserve Vue props');expect(saved.sourceProvider).toBe('vue-vnode');expect(saved.identifiers).toBeUndefined();await verifySource('vue',saved.source,/^node\('button',props/);
  await page.reload();await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
});
test('Vue attribute fallthrough preserves the native render location',async({page})=>{
  await page.goto('http://127.0.0.1:5174/source.html');await expect(page.locator('#vue-fallthrough')).toHaveClass('inherited-class');
  const saved=await capture(page,'#vue-fallthrough','Fallthrough source');expect(saved.sourceKind).toBe('element');expect(saved.sourceProvider).toBe('vue-vnode');await verifySource('vue',saved.source,/^h\('button'/);
});
test('Vue cloned VNodes retain the original creation location',async({page})=>{
  await page.goto('http://127.0.0.1:5174/source.html');await expect(page.locator('#vue-cloned')).toHaveText('Vue cloned VNode');
  const saved=await capture(page,'#vue-cloned','Cloned source');expect(saved.sourceKind).toBe('element');await verifySource('vue',saved.source,/^node\('button', null/);
});
test('Vue conditional directives keep their original update behavior',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:5174/source.html');
  const button=page.locator('#vue-conditional-directive');await expect(button).toHaveText('Directive off');await button.click();await expect(button).toHaveText('Directive on');await button.click();await expect(button).toHaveText('Directive off');
  const saved=await capture(page,'#vue-conditional-directive','Directive source');expect(saved.sourceKind).toBe('element');await verifySource('vue',saved.source,/^h\('button'/);expect(errors).toEqual([]);
});
test('Vue cached roots never borrow the source of an unrelated unused render call',async({page})=>{
  await page.goto('http://127.0.0.1:5174/source.html');await page.locator('#vue-cached-source').click();
  const saved=await capture(page,'#vue-cached-source','Cached source safety');
  if(saved.source) await verifySource('vue',saved.source,/^h\('button',\{id:'vue-cached-source'/);
  else {expect(saved.sourceKind).toBe('component');expect(saved.componentFile.file).toMatch(/SourceCached\.vue$/);}
});
test('Vue setup keeps its context argument and returned render source',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:5174/source.html');
  await expect(page.locator('#vue-setup-context')).toHaveText('Vue setup context');const saved=await capture(page,'#vue-setup-context','Setup context source');expect(saved.sourceKind).toBe('element');await verifySource('vue',saved.source,/^h\('button'/);expect(errors).toEqual([]);
});
test('invalid nearest metadata cannot hide a valid ancestor location',async({page})=>{
  const bundle=await build({entryPoints:['src/identity.ts'],bundle:true,write:false,format:'esm',platform:'browser'});
  await page.route('**/source-identity.js',route=>route.fulfill({contentType:'text/javascript',body:bundle.outputFiles[0].text}));await page.goto('http://127.0.0.1:5173/');
  const details=await page.evaluate(async()=>{const {detailsFor}=await import('/source-identity.js');const parent=document.createElement('div');parent.dataset.noktiqSource='Parent.tsx:8:2';parent.innerHTML='<span data-noktiq-source="invalid">Child</span>';document.body.append(parent);return detailsFor(parent.firstElementChild!)});
  expect(details.source).toBe('Parent.tsx:8:2');expect(details.sourceKind).toBe('ancestor');expect(details.sourceScope).toBe('div');
});

for(const selector of ['#vue-kebab-source button','#vue-capital-source button','#vue-kebab-router button']) test(`Vue ${selector} keeps the native child source instead of the component usage`,async({page})=>{
  await page.goto('http://127.0.0.1:5174/source.html');
  const saved=await capture(page,selector,'Keep the native source');
  expect(saved.source).toBe('SourceKebabButton.vue:2:3');expect(saved.sourceKind).toBe('element');
});
