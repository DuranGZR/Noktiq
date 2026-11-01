import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root=resolve(import.meta.dirname,'..'), npm=process.env.npm_execpath;
assert.ok(npm,'Run npm run prepare:ecosystem');
const workspace=join(root,'.local-validation/ecosystem');
const mode=process.env.NOKTIQ_ECOSYSTEM_LEGACY==='1'?'legacy':'current';
const shared={vite:'7.3.1',typescript:'5.9.3'};
const dependencies={
  react:{...shared,react:'19.2.1','react-dom':'19.2.1','@vitejs/plugin-react':'5.1.1','@mui/material':'9.5.0','@emotion/react':'11.14.0','@emotion/styled':'11.14.1','@base-ui/react':'1.9.0','radix-ui':'1.8.1','class-variance-authority':'0.7.1','react-router-dom':'7.18.5','@tanstack/react-router':'1.170.46','@tanstack/react-virtual':'3.14.24','@tanstack/react-table':'8.21.3','ag-grid-react':'36.2.0','ag-grid-community':'36.2.0',tailwindcss:'^4.1.0','@tailwindcss/vite':'^4.1.0','tw-animate-css':'^1.3.0'},
  vue:{...shared,vue:'3.5.44','@vitejs/plugin-vue':'6.0.10',primevue:'5.0.4',vuetify:'4.3.1','vue-router':'4.6.4','@tanstack/vue-virtual':'3.13.50'},
};
const registries=[];
if(mode==='legacy'){
  dependencies.react['@mui/material']='7.3.11';
  dependencies.vue.primevue='4.5.5';
  dependencies.vue.vuetify='3.13.7';
}
for(const framework of ['react','vue']){
  const cwd=join(workspace,framework);await mkdir(join(cwd,'src'),{recursive:true});
  await writeFile(join(cwd,'package.json'),JSON.stringify({name:`noktiq-ecosystem-${framework}`,private:true,type:'module',dependencies:dependencies[framework]},null,2));
  await cp(join(root,'tests/ecosystem/fixtures',framework),join(cwd,'src'),{recursive:true});
  await cp(join(root,'tests/ecosystem/fixtures/style.css'),join(cwd,'src/style.css'));
  await writeFile(join(cwd,'index.html'),`<div id="root"></div><script type="module" src="/src/main.${framework==='react'?'tsx':'ts'}"></script>`);
  if(framework==='react'){
    await writeFile(join(cwd,'src/main.tsx'),"import {createRoot} from 'react-dom/client';import App from './App';createRoot(document.getElementById('root')!).render(<App/>);");
    await mkdir(join(cwd,'src/app/(create)/components'),{recursive:true});
    await writeFile(join(cwd,'src/app/(create)/components/icon-placeholder.tsx'),"export function IconPlaceholder(){return <svg viewBox='0 0 20 20' aria-hidden='true'><path d='M4 4L16 16M16 4L4 16' stroke='currentColor'/></svg>}");
    await writeFile(join(cwd,'src/cn.ts'),"export const cn=(...values:unknown[])=>values.flat().filter(Boolean).join(' ');");
    await writeFile(join(cwd,'src/style.css'),`@import 'tailwindcss';\n@import 'tw-animate-css';\n@theme {--color-background:white;--color-foreground:#222;--color-border:#ddd;--color-muted:#eee;--color-muted-foreground:#555;--color-popover:white;--color-popover-foreground:#222;--color-accent:#eee;--color-accent-foreground:#222;--color-ring:#f90;}\n${await readFile(join(cwd,'src/style.css'),'utf8')}`);
    for(const style of ['radix-nova','base-nova']) for(const name of ['dialog','button','dropdown-menu']){
      const url=`https://ui.shadcn.com/r/styles/${style}/${name}.json`;
      const response=await fetch(url);assert.ok(response.ok,url);const text=await response.text(),registry=JSON.parse(text);
      for(const file of registry.files){const target=join(cwd,'src',file.path);assert.ok(target.startsWith(join(cwd,'src')+requireSeparator()));await mkdir(resolve(target,'..'),{recursive:true});await writeFile(target,file.content);}
      registries.push({style,name,url,sha256:createHash('sha256').update(text).digest('hex')});
    }
    const license=await fetch('https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md');assert.ok(license.ok);await writeFile(join(cwd,'SHADCN-LICENSE.md'),await license.text());
  }
  const aliases=[...['react','vue'].map(name=>({find:`noktiq/${name}`,replacement:join(root,`dist/${name}.js`)})),{find:'noktiq',replacement:join(root,'dist/index.js')},{find:'@',replacement:join(cwd,'src')},{find:'cn',replacement:join(cwd,'src/cn.ts')}];
  await writeFile(join(cwd,'vite.config.mjs'),`import {defineConfig} from 'vite';import framework from '@vitejs/plugin-${framework}';import {noktiq} from ${JSON.stringify(pathToFileURL(join(root,'dist/vite.js')).href)};${framework==='react'?"import tailwind from '@tailwindcss/vite';":''}export default defineConfig({plugins:[noktiq(),framework()${framework==='react'?',tailwind()':''}],resolve:{alias:${JSON.stringify(aliases)},dedupe:['react','react-dom','vue']},server:{fs:{allow:[${JSON.stringify(root)}]}},optimizeDeps:{exclude:['noktiq','noktiq/react','noktiq/vue']}});`);
  console.log(`Installing ${framework} ecosystem fixtures...`);
  execFileSync(process.execPath,[npm,'install','--no-audit','--no-fund'],{cwd,stdio:'pipe'});
}
await writeFile(join(workspace,'registry-provenance.json'),JSON.stringify({mode,fetchedAt:new Date().toISOString(),registries,dependencies},null,2));
console.log('Ecosystem fixtures ready. Shadcn registry files are unchanged; project cn/icon dependencies are supplied locally.');
function requireSeparator(){return process.platform==='win32'?'\\':'/'}
