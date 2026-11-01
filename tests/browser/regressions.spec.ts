import { test, expect, type Page } from '@playwright/test';
import { build } from 'esbuild';

const contextBundle = await build({entryPoints:['src/context.ts'],bundle:true,write:false,format:'iife',globalName:'auditContext',platform:'browser'});
const storeBundle = await build({entryPoints:['src/storage.ts'],bundle:true,write:false,format:'iife',globalName:'auditStore',platform:'browser'});
async function editor(page:Page, text:string) {
  await page.getByRole('button',{name:'Open Noktiq',exact:true}).click();
  await page.locator('#demo-cta').click();
  await page.getByRole('textbox',{name:'What should change?'}).fill(text);
}
async function save(page:Page) {
  await page.getByRole('button',{name:'Save note',exact:true}).click();
  await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
}
for(const port of [5173,5174]) {
  test(`${port}: simultaneous tab saves merge, remote deletion cannot resurrect a draft, clear synchronizes`,async({page,context})=>{
    await page.goto(`http://127.0.0.1:${port}`);
    const other=await context.newPage();await other.goto(`http://127.0.0.1:${port}`);
    await editor(page,'First tab');await editor(other,'Second tab');
    await Promise.all([save(page),save(other)]);
    for(const p of [page,other]) await expect(p.locator('noktiq-toolbar .pin')).toHaveCount(2);
    await page.getByRole('button',{name:'Show notes',exact:true}).click();
    await other.getByRole('button',{name:'Show notes',exact:true}).click();
    const row=page.locator('noktiq-toolbar .row').filter({has:page.locator('.note',{hasText:'First tab'})});
    await other.locator('noktiq-toolbar .row').filter({has:other.locator('.note',{hasText:'First tab'})}).getByRole('button',{name:'Edit',exact:true}).click();
    await other.getByRole('textbox',{name:'What should change?'}).fill('Keep my unsaved explanation');
    await row.getByRole('button',{name:'Delete',exact:true}).click();await expect(page.locator('noktiq-toolbar .row')).toHaveCount(1);
    await other.getByRole('button',{name:'Save note',exact:true}).click();
    await expect(other.locator('noktiq-toolbar .status')).toContainText('deleted in another tab');
    await expect(other.getByRole('textbox',{name:'What should change?'})).toHaveValue('Keep my unsaved explanation');
    await other.getByRole('button',{name:'Cancel',exact:true}).click();
    await other.getByRole('button',{name:'Show notes',exact:true}).click();
    await page.getByRole('button',{name:'Clear all',exact:true}).click();
    for(const p of [page,other]) await expect(p.locator('noktiq-toolbar .row')).toHaveCount(0);
    await other.reload();await other.getByRole('button',{name:'Open Noktiq',exact:true}).click();await other.getByRole('button',{name:'Show notes',exact:true}).click();await expect(other.locator('noktiq-toolbar .row')).toHaveCount(0);
  });

  test(`${port}: native modal opening order and closing restore the actual interactive portal`,async({page})=>{
    await page.goto(`http://127.0.0.1:${port}`);
    await page.evaluate(()=>{for(const id of ['first','second']){const d=document.createElement('dialog');d.id=id;d.innerHTML=`<button id="${id}-target">${id} target</button>`;document.body.append(d);} (document.querySelector('#second') as HTMLDialogElement).showModal();(document.querySelector('#first') as HTMLDialogElement).showModal();});
    await expect(page.locator('#first > noktiq-toolbar')).toHaveCount(1);
    await page.getByRole('button',{name:'Open Noktiq',exact:true}).click();await page.locator('#first-target').click();await expect(page.getByRole('textbox',{name:'What should change?'})).toBeFocused();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.keyboard.press('Escape');
    await page.evaluate(()=>(document.querySelector('#first') as HTMLDialogElement).close());
    await expect(page.locator('#second > noktiq-toolbar')).toHaveCount(1);
    await page.getByRole('button',{name:'Open Noktiq',exact:true}).click();await page.locator('#second-target').click();await expect(page.getByRole('textbox',{name:'What should change?'})).toBeFocused();
  });
}

test('text capture stays read-only, excludes hidden/private/form content and retains the visible target',async({page})=>{
  await page.goto('http://127.0.0.1:5173');await page.addScriptTag({content:contextBundle.outputFiles[0].text});
  const result=await page.evaluate(()=>{
    const api=(window as any).auditContext;let constructors=0;
    customElements.define('audit-card',class extends HTMLElement{constructor(){super();constructors++;}});
    const target=document.createElement('div');target.id='audit-visible';target.innerHTML='Visible<br>label<audit-card> custom</audit-card><span hidden>Hidden A</span><span style="display:none">Secret CSS</span><span style="visibility:hidden">Secret visibility</span><input value="Private form"><span data-noktiq-private>Private region</span>';document.body.append(target);
    const before=constructors,captured={...api.contextFor(target),id:'note',note:'Keep this'};
    target.querySelector('[hidden]')!.textContent='Hidden B';
    return{before,after:constructors,text:captured.text,status:api.locateAnnotation(document,captured).status};
  });
  expect(result).toEqual({before:1,after:1,text:'Visible label custom',status:'found'});
});

test('storage failure recovery merges remote notes and pending changes without replaying clear against new notes',async({page,context})=>{
  await context.addInitScript({content:storeBundle.outputFiles[0].text+';window.auditStore=auditStore;'});await page.goto('http://127.0.0.1:5173');
  const other=await context.newPage();await other.goto('http://127.0.0.1:5173');
  const change=async(p:Page,id:string,type='save')=>p.evaluate(async({id,type})=>{const page=location.origin+location.pathname,api=(window as any).auditStore;return api.changeNotes(page,type==='clear'?{type:'clear'}:{type:'save',existing:false,note:{id,page,selector:'#demo-cta',tag:'button',text:'',viewport:{width:100,height:100},note:id}},api.loadNotes(page));},{id,type});
  await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).restore=()=>{Storage.prototype.setItem=original};Storage.prototype.setItem=()=>{throw new DOMException('Denied','SecurityError')};});
  expect((await change(page,'pending')).stored).toBe(false);
  expect((await change(other,'remote')).stored).toBe(true);
  await page.evaluate(()=>(window as any).restore());
  expect((await change(page,'new')).notes.map((n:any)=>n.id).sort()).toEqual(['new','pending','remote']);
  await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).restore=()=>{Storage.prototype.setItem=original};Storage.prototype.setItem=()=>{throw new DOMException('Denied','SecurityError')};});
  expect((await change(page,'','clear')).stored).toBe(false);
  await change(other,'after-clear');await page.evaluate(()=>(window as any).restore());
  const result=await change(page,'last');expect(result.stored).toBe(true);expect(result.notes.map((n:any)=>n.id).sort()).toEqual(['after-clear','last']);
});

test('blocked write coordination keeps the note in memory and warns instead of overwriting durable storage',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'indexedDB',{configurable:true,get(){throw new DOMException('Denied','SecurityError');}}));
  await page.goto('http://127.0.0.1:5173');await editor(page,'Keep this memory-only note');await save(page);
  await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);await expect(page.locator('noktiq-toolbar .toast')).toContainText('Browser storage is unavailable');
  expect(await page.evaluate(()=>localStorage.getItem(`noktiq:v1:${location.origin}${location.pathname}`))).toBeNull();
  await page.getByRole('button',{name:'Show notes',exact:true}).click();await expect(page.locator('noktiq-toolbar .note')).toHaveText('Keep this memory-only note');
});

for (const port of [5173,5174]) test(`${port}: a remotely deleted rebind restores toolbar controls`,async({page,context})=>{
  await page.goto(`http://127.0.0.1:${port}`);await editor(page,'Rebind this note');await save(page);
  const other=await context.newPage();await other.goto(`http://127.0.0.1:${port}`);
  await page.getByRole('button',{name:'Show notes',exact:true}).click();
  await page.locator('noktiq-toolbar .note-details summary').click();
  await page.getByRole('button',{name:'Rebind target',exact:true}).click();
  await expect(page.getByRole('button',{name:'Tools and settings',exact:true})).toBeDisabled();
  await other.getByRole('button',{name:'Open Noktiq',exact:true}).click();await other.getByRole('button',{name:'Show notes',exact:true}).click();
  await other.getByRole('button',{name:'Clear all',exact:true}).click();
  await expect(page.getByRole('button',{name:'Tools and settings',exact:true})).toBeEnabled();
  await expect(page.locator('noktiq-toolbar .toast')).toContainText('deleted in another tab');
  await page.getByRole('button',{name:'Tools and settings',exact:true}).click();
  await expect(page.getByLabel('Selection mode',{exact:true})).toBeVisible();
});

test('text capture separates blocks and omits SVG descriptions and inert template content',async({page})=>{
  await page.goto('http://127.0.0.1:5173');await page.addScriptTag({content:contextBundle.outputFiles[0].text});
  const text=await page.evaluate(()=>{
    const target=document.createElement('article');target.innerHTML='Before<div>Block one</div><p>Block two</p>After<svg><title>Not visible</title><desc>SVG description</desc><text>Chart label</text></svg><template>Template content</template><datalist><option>Form suggestion</option></datalist><noscript>Fallback content</noscript>';
    document.body.append(target);return (window as any).auditContext.contextFor(target).text;
  });
  expect(text).toBe('Before Block one Block two AfterChart label');
});

test('native modal without an interactive backdrop retains the toolbar when Nok has focus',async({page})=>{
  await page.goto('http://127.0.0.1:5173');
  await page.addStyleTag({content:'dialog::backdrop { pointer-events:none; }'});
  await page.evaluate(()=>{
    for(const id of ['foreground-dialog','background-dialog']){const d=document.createElement('dialog');d.id=id;d.innerHTML=`<button id="${id}-action">Modal action</button>`;document.body.append(d);}
    (document.querySelector('#background-dialog') as HTMLDialogElement).showModal();
    (document.querySelector('#foreground-dialog') as HTMLDialogElement).showModal();
  });
  await expect(page.locator('#foreground-dialog > noktiq-toolbar')).toHaveCount(1);
  await page.getByRole('button',{name:'Open Noktiq',exact:true}).click();await page.waitForTimeout(900);
  await expect(page.locator('#foreground-dialog > noktiq-toolbar')).toHaveCount(1);
  await page.locator('#foreground-dialog-action').click();await expect(page.getByRole('textbox',{name:'What should change?'})).toBeFocused();
});
