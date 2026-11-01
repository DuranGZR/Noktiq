import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { packPackage } from './pack-package.mjs';

const root = resolve(import.meta.dirname, '..');
const npm = process.env.npm_execpath;
const runtime = process.env.NOKTIQ_TEST_NODE || process.execPath;
assert.ok(npm, 'Use npm run verify:compatibility');
const workspace = join(root, '.local-validation/compatibility');
await mkdir(workspace, { recursive: true });
const tarball = await packPackage();
const packed = join(root, tarball.filename);
const cases = [
  { name:'next14', next:'14.2.35', react:'18.3.1', engines:['webpack','turbopack'] },
  { name:'next15-legacy', next:'15.2.9', react:'18.3.1', engines:['webpack','turbopack'] },
  { name:'next16', next:'16.4.3', react:'19.2.1', engines:['webpack','turbopack'] },
  { name:'next15', next:'15.5.28', react:'18.3.1', engines:['webpack','turbopack'] },
  { name:'react18-vite6', react:'18.3.1', vite:'6.4.1', plugin:'4.7.0' },
  { name:'react19-vite7', react:'19.2.1', vite:'7.3.1', plugin:'5.1.1' },
  { name:'react-three', react:'19.2.1', vite:'7.3.1', plugin:'5.1.1', three:true },
  { name:'vue34-vite6', vue:'3.4.38', vite:'6.4.1', plugin:'5.2.4' },
  { name:'nuxt3', nuxt:'3.21.11' },
  { name:'nuxt4', nuxt:'4.6.3' },
];
const selected = process.argv.slice(2);
const results = [];
const browser = await chromium.launch({ channel:'chrome' });
const env = { ...process.env, NEXT_TELEMETRY_DISABLED:'1', NUXT_TELEMETRY_DISABLED:'1' };
const wait = ms => new Promise(done => setTimeout(done, ms));
async function ready(port, child, log) {
  const until = Date.now() + 180000;
  while (Date.now() < until) {
    if (child.exitCode !== null) throw new Error(`Server exited ${child.exitCode}: ${log()}`);
    let response;
    try { response = await fetch(`http://127.0.0.1:${port}`, { signal:AbortSignal.timeout(1500) }); } catch {}
    if (response?.ok) return;
    if (response?.status === 500) throw new Error(`Server HTTP ${response.status}: ${log()}`);
    await wait(500);
  }
  throw new Error(`Server timeout: ${log()}`);
}
async function server(cwd, args, port, action, extra = {}) {
  let log = '';
  const child = spawn(runtime, args, { cwd, env:{...env,...extra}, stdio:['ignore','pipe','pipe'] });
  for (const stream of [child.stdout,child.stderr]) stream.on('data', chunk => { log = (log + chunk).slice(-20000); });
  try { await ready(port,child,()=>log); await action(); }
  catch (error) { throw new Error(`${error.message}\n${log}`, {cause:error}); }
  finally {
    if (child.exitCode === null) {
      // On Windows Next/Nuxt spawn server descendants; stop this test's process tree.
      if (process.platform === 'win32') { try { execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'}); } catch {} }
      else child.kill('SIGTERM');
    }
  }
}
async function inspect(cwd, port, route, source, production = false, selector = '#compat-target', creation = '<button', exact = true) {
  const context = await browser.newContext();
  await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Use preview')}}}));
  try {
    const page = await context.newPage(); const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(`http://127.0.0.1:${port}${route}`);
    await page.locator(selector).waitFor();
    if(await page.locator('canvas').count()){await page.waitForFunction(()=>window.__noktiq3d===true);assert.deepEqual(errors,[]);}
    if (production) {
      assert.equal(await page.locator('noktiq-toolbar').count(),0);
      assert.equal(await page.locator('[data-noktiq-source]').count(),0); return;
    }
    const sourceText = await readFile(join(cwd,source),'utf8'), offset = sourceText.indexOf(creation);
    const expected = `${source}:${sourceText.slice(0,offset).split('\n').length}:${offset-sourceText.lastIndexOf('\n',offset)}`;
    if(exact&&creation.startsWith('<')) assert.equal(await page.locator(selector).getAttribute('data-noktiq-source'),expected);
    await page.getByRole('button',{name:'Open Noktiq',exact:true}).click();
    await page.locator(selector).click(); await page.getByRole('textbox',{name:'What should change?'}).fill('Compatibility check');
    await page.getByRole('button',{name:'Save note',exact:true}).click(); await page.getByRole('button',{name:'Copy',exact:true}).click();
    const markdown = await page.getByRole('textbox',{name:'Output for your coding agent'}).inputValue();
    if(exact) assert.ok(markdown.includes(`Source: ${expected}`));else {assert.ok(markdown.includes(selector.replace('#','')));assert.ok(!markdown.includes('Source kind: selected element definition'));} assert.ok(markdown.indexOf('Source:')<markdown.indexOf('Selector:'));
    await page.reload(); await page.locator('noktiq-toolbar .pin').waitFor();
  } finally { await context.close(); }
}
try {
  for (const item of cases.filter(item=>!selected.length || selected.includes(item.name))) {
    const cwd=join(workspace,item.name); await mkdir(cwd,{recursive:true});
    const dependencies={noktiq:`file:${packed.replaceAll('\\','/')}`};
    if(item.react) Object.assign(dependencies,{react:item.react,'react-dom':item.react});
    if(item.vue) dependencies.vue=item.vue;
    if(item.three) Object.assign(dependencies,{'@react-three/fiber':'9.4.2',three:'0.182.0'});
    if(item.next) Object.assign(dependencies,{next:item.next,typescript:'5.9.3','@types/react':item.react.startsWith('18.')?'18.3.28':'19.2.14','@types/node':'22.19.15'});
    if(item.vite) Object.assign(dependencies,{vite:item.vite,[`@vitejs/plugin-${item.vue?'vue':'react'}`]:item.plugin});
    if(item.nuxt) Object.assign(dependencies,{nuxt:item.nuxt,vue:'3.5.44'});
    await writeFile(join(cwd,'package.json'),JSON.stringify({name:`noktiq-${item.name}`,private:true,type:'module',dependencies},null,2));
    console.log(`Installing ${item.name}...`);
    execFileSync(runtime,[npm,'install','--no-audit','--no-fund',packed],{cwd,stdio:'pipe'});
    for(const name of await readdir(join(root,'dist'))) assert.equal(await readFile(join(cwd,'node_modules/noktiq/dist',name),'utf8'),await readFile(join(root,'dist',name),'utf8'),`Stale installed file: ${item.name}/${name}`);
    for(const name of ['.next-webpack','.next-turbopack','.nuxt','.output','dist','node_modules/.vite','node_modules/.cache']) {
      const cache=resolve(cwd,name);assert.ok(cache.startsWith(cwd+sep));await rm(cache,{recursive:true,force:true});
    }
    const write=async(path,content)=>{await mkdir(resolve(cwd,path,'..'),{recursive:true});await writeFile(join(cwd,path),content)};
    if(item.next) {
      await write('next.config.mjs',"import {withNoktiq} from 'noktiq/next';export default withNoktiq({distDir:'.next-'+(process.env.TEST_ENGINE||'webpack')});");
      await write('app/layout.jsx',"export default function Layout({children}){return <html><body>{children}</body></html>}");
      const screen="'use client';import {Noktiq} from 'noktiq/react';import Factory from '../Factory';import Typed from '../FactoryTyped';export default function Page(){return <><button id=\"compat-target\">Compatibility target</button><Factory/><Typed/><Noktiq enabled={process.env.NODE_ENV==='development'}/></>}";
      await write('Factory.ts',"import {createElement} from 'react';export default function Factory(){return createElement('button',{id:'factory-target'},'Factory target')}");
      await write('FactoryTyped.tsx',"import {createElement} from 'react';export default function Typed(){const label:string='Typed factory';return createElement('button',{id:'typed-target'},label)}");
      await write('app/page.jsx',screen);await write('pages/router.jsx',screen);
      for(const engine of item.engines) {
        const args=['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','5310',...(engine==='turbopack'?['--turbo']:item.next.startsWith('16.')?['--webpack']:[])];
        await server(cwd,args,5310,async()=>{await inspect(cwd,5310,'/','app/page.jsx');await inspect(cwd,5310,'/router','pages/router.jsx');await inspect(cwd,5310,'/','Factory.ts',false,'#factory-target',"createElement('button'",engine==='webpack'||item.next.startsWith('16.'));await inspect(cwd,5310,'/','FactoryTyped.tsx',false,'#typed-target',"createElement('button'")},{TEST_ENGINE:engine});
        console.log(`PASS ${item.name} ${engine}: App Router + Pages Router, source, copy, restored pin`);
      }
      execFileSync(runtime,['node_modules/next/dist/bin/next','build'],{cwd,env:{...env,TEST_ENGINE:'production'},stdio:'pipe',timeout:180000});
      await server(cwd,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','5310'],5310,()=>inspect(cwd,5310,'/','app/page.jsx',true),{TEST_ENGINE:'production'});
    } else if(item.nuxt) {
      await write('nuxt.config.mjs',`import {noktiq} from 'noktiq/vite';export default defineNuxtConfig({devtools:{enabled:false},vite:{plugins:[noktiq({root:${JSON.stringify(cwd.replaceAll('\\','/'))}})]}});`);
      const appFile=item.nuxt.startsWith('4.')?'app/app.vue':'app.vue';
      await write(appFile,'<script setup>import {Noktiq} from "noktiq/vue";const isDev=import.meta.dev;</script><template><div><button id="compat-target">Compatibility target</button><ClientOnly><Noktiq :enabled="isDev"/></ClientOnly></div></template>');
      await server(cwd,['node_modules/nuxt/bin/nuxt.mjs','dev','--host','127.0.0.1','--port','5310'],5310,()=>inspect(cwd,5310,'/',appFile));
      execFileSync(runtime,['node_modules/nuxt/bin/nuxt.mjs','build'],{cwd,env,stdio:'pipe',timeout:180000});
      await server(cwd,['.output/server/index.mjs'],5310,()=>inspect(cwd,5310,'/',appFile,true),{NITRO_HOST:'127.0.0.1',NITRO_PORT:'5310'});
    } else {
      const framework=item.vue?'vue':'react';
      await write('vite.config.mjs',`import {defineConfig} from 'vite';import framework from '@vitejs/plugin-${framework}';import {noktiq} from 'noktiq/vite';export default defineConfig({plugins:[noktiq(),framework()]});`);
      await write('index.html','<div id="root"></div><script type="module" src="/main.js"></script>');
      if(item.vue) {
        await write('App.vue',`<script setup>import {Noktiq} from "noktiq/vue";import {h,defineComponent} from 'vue';const isDev=import.meta.env.DEV;const RenderCase=defineComponent({render(){return h('button',{id:'render-target'},'Render target')}});</script><template><div><button id="compat-target">Compatibility target</button><RenderCase class="fallthrough"/><Noktiq :enabled="isDev"/></div></template>`);
        await write('main.js',"import {createApp} from 'vue';import App from './App.vue';createApp(App).mount('#root');");
      } else {
        await write('App.jsx',"import {Noktiq} from 'noktiq/react';export default function App(){return <><button id=\"compat-target\">Compatibility target</button><Noktiq enabled={import.meta.env.DEV}/></>}");
        await write('main.js',"import {createElement} from 'react';import {createRoot} from 'react-dom/client';import App from './App.jsx';createRoot(document.getElementById('root')).render(createElement(App));");
      }
      if(item.three){
        await write('Scene.jsx',`import {Canvas} from '@react-three/fiber';import {useRef,useEffect} from 'react';function Mesh(){const ref=useRef();useEffect(()=>{window.__noktiq3d=Boolean(ref.current?.isMesh)},[]);return <mesh ref={ref}><boxGeometry/><meshBasicMaterial color="orange"/></mesh>}export default function Scene(){return <Canvas style={{height:200}}><Mesh/></Canvas>}`);
        await write('App.jsx',`import {Noktiq} from 'noktiq/react';import Scene from './Scene.jsx';export default function App(){return <main><button id="compat-target">Compatibility target</button><Scene/><Noktiq enabled={import.meta.env.DEV}/></main>}`);
      }
      await server(cwd,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5310','--strictPort'],5310,async()=>{await inspect(cwd,5310,'/',item.vue?'App.vue':'App.jsx');if(item.vue) await inspect(cwd,5310,'/','App.vue',false,'#render-target',"h('button'");if(item.three)await inspect(cwd,5310,'/','App.jsx',false,'canvas','<button',false)});
      execFileSync(runtime,['node_modules/vite/bin/vite.js','build'],{cwd,env,stdio:'pipe'});
      await server(cwd,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5310','--strictPort'],5310,()=>inspect(cwd,5310,'/',item.vue?'App.vue':'App.jsx',true));
    }
    const result={...item,node:execFileSync(runtime,['-p','process.version'],{encoding:'utf8'}).trim(),status:'passed',production:'no toolbar or source attributes'};results.push(result);
    await writeFile(join(workspace,`${item.name}-result.json`),JSON.stringify(result,null,2));
    console.log(`PASS ${item.name}: development workflow and production guard`);
  }
  if(selected.length){console.log('Partial run complete; full compatibility report preserved.');process.exitCode=0;}else{
  await mkdir(join(root,'reports'),{recursive:true});
  await writeFile(join(root,'reports/compatibility.json'),JSON.stringify({testedAt:new Date().toISOString(),sdkSha256:createHash('sha256').update(await readFile(join(root,'dist/shared-chunk.js'))).digest('hex'),cases:results},null,2));
  await writeFile(join(root,'reports/compatibility.md'),[
    '# Noktiq compatibility', '', `Tested: ${new Date().toISOString()}`, '',
    '| Project | Next / Nuxt | React / Vue | Vite | Node | Result |', '| --- | --- | --- | --- | --- | --- |',
    ...results.map(item=>`| ${item.name} | ${item.next||item.nuxt||'-'} | ${item.react||item.vue||'Vue 3.5.44'} | ${item.vite||(item.nuxt?'framework default':'-')} | ${item.node} | passed |`), '',
    'Every case installs the actual package into a separate project, selects an element, verifies its source against the original file, copies Markdown, restores the pin after reload, builds production and verifies the absence of toolbar and source attributes.', '',
    'Next 14/15/16 cover App Router, Pages Router, Webpack, Turbopack and typed TSX factories. Plain .ts factories have exact source in Webpack; old Turbopack uses DOM/ancestor fallback because applying .ts loaders also intercepts virtual HMR modules. Nuxt uses its default source directory (Nuxt 3: app.vue; Nuxt 4: app/app.vue). Vue 3.4 also covers h() and attribute fallthrough. The React Three Fiber case renders a real WebGL mesh without renderer errors, while DOM selection continues to work; individual 3D object selection is not implemented.', '',
    'Next 16 / Webpack production integration: npm run verify:integrations. Baseline browser regression: reports/validation.md. These are fixture compatibility checks, not a guarantee for every application or canvas object.', '',
    'Repeat: npm run build && npm run verify:compatibility. Recent Nuxt 4 requires a compatible Node version (22.21+ or 24.11+). NOKTIQ_TEST_NODE can point to a separate Node executable without changing the system installation.', '',
  ].join('\n'));
  }
} finally { await browser.close(); }
