import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

test.beforeEach(async({page})=>{await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Inspect output')}}}));});
const base=(framework:string)=>`http://127.0.0.1:${framework==='react'?5321:5322}`;
const tool=(page:Page)=>page.locator('noktiq-toolbar');
async function activate(page:Page){await tool(page).locator('.brand').click();}
async function saved(page:Page,path=undefined as string|undefined){return page.evaluate(path=>JSON.parse(localStorage.getItem(`noktiq:v1:${location.origin}${path??location.pathname}`)||'[]'),path);}
async function copy(page:Page){await page.getByRole('button',{name:'Copy',exact:true}).click();const text=await page.getByRole('textbox',{name:'Output for your coding agent'}).inputValue();expect(text).toContain('Requested change:');await test.info().attach('ecosystem-request.md',{body:text,contentType:'text/markdown'});return text;}
async function annotate(page:Page,target:string,note='Ecosystem annotation'){
  await activate(page);await page.locator(target).first().click();
  const input=page.getByRole('textbox',{name:'What should change?'});await expect(input).toBeFocused();
  await input.pressSequentially(note,{delay:2});await expect(input).toHaveValue(note);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(()=>!!document.querySelector('noktiq-toolbar')?.shadowRoot?.activeElement?.closest('.panel'))).toBe(true);
  await page.getByRole('button',{name:'Save note',exact:true}).click();
  await expect.poll(async()=>(await saved(page)).length).toBe(1);
  return (await saved(page))[0];
}
async function verifySource(framework:string,note:any,expectedSource:string){
  expect(note.source||note.componentFile?.file).toBeTruthy();if(!note.source)return;
  const parsed=/^(.*):(\d+):(\d+)$/.exec(note.source)!;expect(parsed).not.toBeNull();
  const root=resolve('.local-validation/ecosystem',framework),file=resolve(root,parsed[1]);expect(relative(root,file).startsWith('..')).toBe(false);
  const code=await readFile(file,'utf8');const start=code.split('\n')[Number(parsed[2])-1].slice(Number(parsed[3])-1);
  expect(start).toMatch(/^(<|h\()/);
  expect(note.sourceKind).toBe('element');
  // A valid-looking JSX line is insufficient: it must define this selected element.
  expect(start.startsWith(expectedSource)).toBe(true);
}

for(const [framework,names]of [['react',['radix','base','mui']],['vue',['prime','vuetify']]] as const)for(const name of names){
  test(`${framework} ${name}: modal focus, typing, source, copy and reopening`,async({page})=>{
    await page.goto(base(framework));await page.locator(`#open-${name}`).click();
    const note=await annotate(page,`#${name}-target`);await verifySource(framework,note,`<button id="${name}-target"`);
    const text=await copy(page);expect(text).toContain(note.source?`Source: ${note.source}`:'Component file:');
    if(name==='mui'&&test.info().project.name==='chrome')await test.info().attach('mui-output.png',{body:await page.screenshot(),contentType:'image/png'});
    await page.keyboard.press('Escape');await expect(page.locator(`#${name}-target`)).toBeVisible();
    await page.locator(`#close-${name}`).click();await expect(tool(page).locator('.brand')).toBeVisible();
    await page.locator(`#open-${name}`).click();await expect(tool(page).locator('.pin')).toHaveCount(1);
    await page.reload();await page.locator(`#open-${name}`).click();await expect(tool(page).locator('.pin')).toHaveCount(1);
  });
}
for(const [framework,name]of [['react','mui'],['vue','vuetify']] as const)test(`${framework} ${name}: library-generated button has honest source context`,async({page})=>{
  await page.goto(base(framework));await page.locator(`#open-${name}`).click();const note=await annotate(page,`#${name}-generated`);
  expect(note.sourceKind).not.toBe('element');expect(note.source||note.componentFile?.file).toBeTruthy();await copy(page);
});
for(const name of ['radix','base','mui'])test(`react ${name}: menu stays open while annotating and typing`,async({page})=>{
  await page.goto(base('react'));await page.locator(`#open-${name}-menu`).click();
  const note=await annotate(page,`#${name}-menu-target`);await verifySource('react',note,`<span id="${name}-menu-target"`);await copy(page);
  await expect(page.locator(`#${name}-menu-target`)).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator(`#${name}-menu-target`)).toBeVisible();
});
for(const name of ['prime','vuetify'])test(`vue ${name}: select popup remains open while the note editor is used`,async({page})=>{
  await page.goto(base('vue'));await (name==='vuetify'?page.locator('.v-select .v-field'):page.locator(`#open-${name}-select`)).click();
  await expect(page.getByRole('option',{name:'Alpha',exact:true})).toBeVisible();
  await activate(page);await page.getByRole('option',{name:'Alpha',exact:true}).click();
  const input=page.getByRole('textbox',{name:'What should change?'});await expect(input).toBeFocused();await input.pressSequentially('Option note');await expect(input).toHaveValue('Option note');
  await page.getByRole('button',{name:'Save note',exact:true}).click();await copy(page);await expect(page.getByRole('option',{name:'Alpha',exact:true})).toBeVisible();
});

for(const [framework,prefix] of [['react','/router/'],['react','/tanstack/'],['vue','/router/']] as const){
  test(`${framework} ${prefix}: navigation clears an unfinished multi-selection`,async({page})=>{
    await page.goto(base(framework)+prefix+'a');await activate(page);await page.keyboard.press('m');await page.locator('#route-target').click();await expect(page.getByRole('button',{name:'Annotate selection',exact:true})).toBeVisible();
    await page.evaluate(to=>(window as any).ecosystemNavigate(to),prefix+'b');await expect(page.locator('#route-target')).toHaveText('Route b');await expect(page.getByRole('button',{name:'Annotate selection',exact:true})).toBeHidden();
  });
  test(`${framework} ${prefix}: real router keeps saved notes separate through navigation and browser back`,async({page})=>{
    await page.goto(base(framework)+prefix+'a');const note=await annotate(page,'#route-target','Route A note');await verifySource(framework,note,framework==='react'?'<button id="route-target"':"h('button',{id:'route-target'}");
    await page.keyboard.press('Escape');await page.evaluate(to=>(window as any).ecosystemNavigate(to),prefix+'b');await expect(page.locator('#route-target')).toHaveText('Route b');
    await expect(tool(page).locator('.pin')).toHaveCount(0);expect((await saved(page,prefix+'a'))[0].note).toBe('Route A note');
    await annotate(page,'#route-target','Route B note');await page.keyboard.press('Escape');await page.goBack();await expect(page.locator('#route-target')).toHaveText('Route a');await expect(tool(page).locator('.pin')).toHaveCount(1);
    await page.goForward();await expect(page.locator('#route-target')).toHaveText('Route b');await expect(tool(page).locator('.pin')).toHaveCount(1);expect((await saved(page))[0].note).toBe('Route B note');
  });
  test(`${framework} ${prefix}: navigating with a draft preserves the text and saves it to the captured page`,async({page})=>{
    await page.goto(base(framework)+prefix+'a');await activate(page);await page.locator('#route-target').click();const input=page.getByRole('textbox',{name:'What should change?'});await input.fill('Keep this draft on A');
    await page.evaluate(to=>(window as any).ecosystemNavigate(to),prefix+'b');await expect(page.locator('#route-target')).toHaveText('Route b');await expect(input).toHaveValue('Keep this draft on A');
    await page.getByRole('button',{name:'Save note',exact:true}).click();await expect.poll(async()=>(await saved(page,prefix+'a')).length).toBe(1);expect(await saved(page,prefix+'b')).toEqual([]);
    await expect(tool(page).locator('.pin')).toHaveCount(0);
  });
}
for(const framework of ['react','vue'])test(`${framework}: virtual rows with repeated labels preserve logical row identity`,async({page})=>{
  await page.goto(base(framework));await page.locator('[data-row-id="record-2"] button').waitFor();
  const note=await annotate(page,'[data-row-id="record-2"] button','Only record 2');await verifySource(framework,note,'<button data-cell="virtual"');await page.keyboard.press('Escape');
  expect(await page.locator('[data-row-id]').count()).toBeLessThan(100);
  expect(JSON.stringify(note)).toContain('record-2');
  await page.locator('#virtual-scroll').evaluate(element=>{element.scrollTop=25000});await expect(page.locator('[data-row-id="record-2"]')).toHaveCount(0);await expect(tool(page).locator('.pin')).toHaveCount(0);
  await page.locator('#virtual-scroll').evaluate(element=>{element.scrollTop=0});await expect(page.locator('[data-row-id="record-2"]')).toBeVisible();await expect(tool(page).locator('.pin')).toHaveCount(1);
  await page.reload();await expect(tool(page).locator('.pin')).toHaveCount(1);await copyAfterOpen(page);
});
async function copyAfterOpen(page:Page){await activate(page);return copy(page)}
test('react AG Grid: native row and column keys distinguish repeated cells after virtualization',async({page})=>{
  await page.goto(base('react'));await page.locator('#ag-table [row-id="record-2"] [col-id="name"]').waitFor();
  const note=await annotate(page,'#ag-table [row-id="record-2"] [col-id="name"]','Only AG record 2');expect(JSON.stringify(note)).toContain('record-2');expect(JSON.stringify(note)).toContain('name');await page.keyboard.press('Escape');
  await page.evaluate(()=>(window as any).gridApi.ensureIndexVisible(15000,'top'));await expect(page.locator('#ag-table [row-id="record-2"]')).toHaveCount(0);await expect(tool(page).locator('.pin')).toHaveCount(0);
  await page.evaluate(()=>(window as any).gridApi.ensureIndexVisible(0,'top'));await expect(page.locator('#ag-table [row-id="record-2"]')).toBeVisible();await expect(tool(page).locator('.pin')).toHaveCount(1);
});
test('hidden keepMounted dialogs do not hide the normal toolbar',async({page})=>{
  await page.goto(base('react'));await expect(tool(page).locator('.brand')).toBeVisible();await annotate(page,'#normal-target');await copy(page);
  expect(await page.evaluate(()=>(window as any).applicationClicks||0)).toBe(0);
});
test('React Router: blocked storage retains notes across route changes for this session',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}}}));
  await page.goto(base('react')+'/router/a');await activate(page);await page.locator('#route-target').click();await page.getByRole('textbox',{name:'What should change?'}).fill('Unsaved storage A');
  await page.evaluate(()=>(window as any).ecosystemNavigate('/router/b'));await expect(page.locator('#route-target')).toHaveText('Route b');await page.getByRole('button',{name:'Save note',exact:true}).click();
  await expect(tool(page).locator('.toast')).toContainText('Browser storage');await page.keyboard.press('Escape');
  await page.evaluate(()=>(window as any).ecosystemNavigate('/router/a'));await expect(page.locator('#route-target')).toHaveText('Route a');await expect(tool(page).locator('.pin')).toHaveCount(1);
  const markdown=await copyAfterOpen(page);expect(markdown).toContain('Unsaved storage A');expect(markdown).toContain('/router/a');
});
