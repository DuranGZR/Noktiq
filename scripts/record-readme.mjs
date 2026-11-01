import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir, stat, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium, expect } from '@playwright/test';
import { noktiq } from '../dist/vite.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const fixture=join(root,'scripts/readme-demo');
const scratch=join(root,'.local-validation/readme-media');
const assets=join(root,'docs/assets');
await mkdir(scratch,{recursive:true});
let ffmpeg=process.env.NOKTIQ_FFMPEG;
if(!ffmpeg){
  const local=join(root,'.local-validation/media-tools/imageio_ffmpeg/binaries');
  try { ffmpeg=join(local,(await readdir(local)).find(name=>/^ffmpeg.*\.exe$/.test(name))); } catch { ffmpeg='ffmpeg'; }
}
function encode(args){const result=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.error?.message||result.stderr);}
assert.equal(spawnSync(ffmpeg,['-version'],{windowsHide:true}).status,0,'Set NOKTIQ_FFMPEG to a full FFmpeg executable before recording.');
const server=await createServer({configFile:false,root:fixture,cacheDir:join(scratch,'vite-cache'),plugins:[noktiq(),react()],resolve:{alias:{'noktiq/react':join(root,'dist/react.js')}},optimizeDeps:{exclude:['noktiq/react']},server:{host:'127.0.0.1',port:5330,strictPort:true,fs:{allow:[root]}}});
let browser,context;
try {
  await server.listen();
  browser=await chromium.launch({channel:'chrome'});
  // Compile the fixture before recording so the opening frame is the product, not a loader.
  const warmup=await browser.newPage();await warmup.goto('http://127.0.0.1:5330');await warmup.locator('noktiq-toolbar .brand').waitFor();await warmup.close();
  context=await browser.newContext({viewport:{width:1280,height:860},deviceScaleFactor:1,permissions:['clipboard-read','clipboard-write'],recordVideo:{dir:scratch,size:{width:1280,height:860}}});
  const started=Date.now(),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5330');await page.locator('noktiq-toolbar .brand').waitFor();await page.evaluate(()=>Promise.all([document.fonts.ready,...[...document.images].map(image=>image.decode())]));
  const trim=(Date.now()-started)/1000;
  await page.evaluate(()=>{
    const shadow=document.querySelector('noktiq-toolbar').shadowRoot;
    const cursor=document.createElement('div');cursor.setAttribute('aria-hidden','true');
    cursor.style.cssText='position:fixed;left:0;top:0;width:20px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(1100px,120px);';
    cursor.innerHTML='<svg viewBox="0 0 24 30" width="20" height="26"><path d="M2 2L3 24L9 19L13 28L18 26L14 17L22 16Z" fill="#33382e" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg>';
    shadow.append(cursor);window.addEventListener('pointermove',e=>{cursor.style.transform=`translate(${e.clientX}px,${e.clientY}px)`},{capture:true});
  });
  const hold=ms=>page.waitForTimeout(ms);
  async function point(locator){const rect=await locator.boundingBox();assert.ok(rect);await page.mouse.move(rect.x+rect.width*.55,rect.y+rect.height*.5,{steps:24});await hold(450);await locator.click({position:{x:Math.min(rect.width*.55,rect.width-2),y:rect.height*.5}});}
  async function chapter(number,title,description){await page.evaluate(({number,title,description})=>{document.querySelector('#chapter-number').textContent=number;document.querySelector('#chapter-title').textContent=title;document.querySelector('#chapter-description').textContent=description;document.querySelectorAll('.chapter-track i').forEach((item,i)=>item.classList.toggle('active',i===Number(number[1])-1));},{number,title,description});}
  await hold(1300);
  await chapter('01 / POINT','A companion that moves with you.','Hold and drag Nok to a comfortable spot.');
  const mascot=page.locator('noktiq-toolbar .brand'),before=(await mascot.boundingBox());
  await page.mouse.move(before.x+before.width/2,before.y+before.height/2,{steps:20});await page.mouse.down();await hold(350);await page.mouse.move(1150,705,{steps:32});await page.mouse.up();
  await expect(mascot).toHaveAttribute('aria-expanded','false');assert.ok((await mascot.boundingBox()).y<before.y-60);await hold(800);
  await chapter('01 / POINT','Point to the change.','Click Nok, then select the element you want to change.');
  await point(page.locator('noktiq-toolbar .brand'));await hold(400);
  await point(page.locator('#demo-cta'));
  const input=page.getByRole('textbox',{name:'What should change?'});await expect(input).toBeFocused();
  await chapter('02 / NOTE','Describe the change, right where it belongs.','The selected element keeps its source file and line.');
  await input.pressSequentially('Give this button a 12px radius and more horizontal padding.',{delay:34});await hold(900);
  await point(page.getByRole('button',{name:'Save note',exact:true}));await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);await hold(800);
  await point(page.locator('#demo-heading'));await input.pressSequentially('Make this heading 56px. Keep the serif typeface.',{delay:29});await hold(500);await point(page.getByRole('button',{name:'Save note',exact:true}));
  await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(2);await hold(800);
  const notes=await page.evaluate(()=>JSON.parse(localStorage.getItem(`noktiq:v1:${location.origin}/`)));
  const source=await readFile(join(fixture,'main.tsx'),'utf8');
  for(const [index,tag] of ['button id="demo-cta"','h2 id="demo-heading"'].entries()){
    assert.equal(notes[index].sourceKind,'element');const parsed=/^(.*):(\d+):(\d+)$/.exec(notes[index].source);assert.ok(parsed);assert.ok(source.split('\n')[Number(parsed[2])-1].slice(Number(parsed[3])-1).startsWith('<'+tag));
  }
  await chapter('02 / NOTE','Every thought, neatly in place.','Review your notes. Copy one request, or all of them.');
  await point(page.getByRole('button',{name:'Show notes',exact:true}));await expect(page.locator('noktiq-toolbar .row')).toHaveCount(2);await hold(1000);
  await page.mouse.move(1040,130,{steps:16});await page.screenshot({path:join(assets,'noktiq-demo-poster.png')});await hold(1500);
  await chapter('03 / PASTE','Two notes. One clear handoff.','Copy the context into the coding agent you already use.');
  await point(page.locator('noktiq-toolbar .menu').getByRole('button',{name:'Copy',exact:true}));
  const output=await page.evaluate(()=>navigator.clipboard.readText());
  for(const note of notes){assert.ok(output.includes('Source: '+note.source));assert.ok(output.includes(note.note));}
  assert.ok(output.includes('Selector: #demo-cta'));assert.ok(output.includes('Selector: #demo-heading'));
  assert.equal(await page.locator('#application-clicks').textContent(),'0');assert.deepEqual(errors,[]);
  await hold(1400);
  await page.keyboard.press('Escape');await page.evaluate(output=>{document.querySelector('#clipboard-text').textContent=output.split('\n').filter(line=>/^(## \d|Source:|Selector:|Visible text:|Requested change:)/.test(line)).join('\n');document.querySelector('#clipboard-preview').hidden=false;const style=document.createElement('style');style.textContent='pre{font-size:12px;line-height:1.65;max-height:359px}';document.head.append(style);},output);
  await page.locator('#clipboard-preview h2').click();await hold(1100);await page.mouse.move(1040,130,{steps:16});await hold(700);
  await hold(4000);
  const video=page.video();await context.close();context=undefined;
  const raw=await video.path();await copyFile(raw,join(scratch,'walkthrough.webm'));
  encode(['-ss',String(trim),'-i',raw,'-an','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',join(assets,'noktiq-demo.mp4')]);
  encode(['-i',join(assets,'noktiq-demo.mp4'),'-filter_complex','fps=10,scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle','-loop','0',join(assets,'noktiq-demo.gif')]);
  const sizes={};for(const name of ['noktiq-demo.gif','noktiq-demo.mp4','noktiq-demo-poster.png'])sizes[name]=(await stat(join(assets,name))).size;
  assert.ok(sizes['noktiq-demo.gif']<10_000_000,'GIF must remain below GitHub\'s 10MB attachment limit');
  await writeFile(join(scratch,'verified-request.md'),output);
  await writeFile(join(root,'docs/walkthrough-request.md'),'# Recorded walkthrough output\n\nCaptured from the real Noktiq toolbar in the [recording fixture](../scripts/readme-demo/main.tsx). Source paths are relative to that fixture.\n\n```text\n'+output+'\n```\n');
  await writeFile(join(scratch,'recording.json'),JSON.stringify({recordedAt:new Date().toISOString(),sourceValidated:true,dragValidated:true,notesListValidated:true,notes:notes.length,sizes},null,2));
  console.log('PASS actual selection, two notes, exact source, pins, real clipboard, zero application clicks and no browser errors.');console.log(sizes);
} finally {await context?.close();await browser?.close();await server.close();}
