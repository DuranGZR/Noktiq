import { test, expect, type Page } from '@playwright/test';
import { build } from 'esbuild';
async function activate(page: Page) { await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click(); }
async function save(page: Page, note: string) { await page.getByRole('textbox', { name: 'What should change?' }).fill(note); await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden(); }
async function notes(page: Page) { await page.getByRole('button', { name: 'Show notes', exact: true }).click(); }
async function stored(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem(`noktiq:v1:${location.origin}${location.pathname}`) || '[]')); }
for (const [framework, port] of [['react',5173], ['vue',5174]] as const) test.describe(framework, () => {
  test.beforeEach(async ({ page }) => { await page.goto(`http://127.0.0.1:${port}/lab.html`); await page.locator('noktiq-toolbar .brand').waitFor(); });
  test('parent navigation and undo preserve typed text and save the new location', async ({ page }) => {
    await activate(page); await page.locator('[data-testid="card-beta"] button span').click();
    const input = page.getByRole('textbox', { name: 'What should change?' }); await input.fill('Keep my explanation');
    await page.getByRole('button', { name: 'Select parent', exact: true }).click();
    await expect(page.locator('noktiq-toolbar code')).toContainText('repeated-action'); await expect(input).toHaveValue('Keep my explanation');
    await page.getByRole('button', { name: 'Previous element', exact: true }).click(); await expect(page.locator('noktiq-toolbar code')).toContainText('span');
    await input.focus(); await page.keyboard.press('Alt+ArrowUp'); await page.keyboard.press('Alt+ArrowUp');
    await expect(input).toHaveValue('Keep my explanation'); await save(page, 'Keep my explanation');
    expect((await stored(page))[0].selector).toBe('[data-testid="card-beta"]');
    await page.reload(); await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
  });
  test('an SVG path can move through the SVG to its actual button', async ({ page }) => {
    await page.locator('[data-testid="card-beta"] button').evaluate(button => {
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('width','16');svg.setAttribute('height','16');
      const path=document.createElementNS(svg.namespaceURI,'path'); path.setAttribute('d','M0 0H16V16H0Z');path.id='nested-test-icon';svg.append(path);button.append(svg);
    });
    await activate(page); await page.locator('#nested-test-icon').click(); await save(page,'Select actual button later');
    await page.locator('noktiq-toolbar .pin').click();
    await page.getByRole('button',{name:'Select parent',exact:true}).click(); await page.getByRole('button',{name:'Select parent',exact:true}).click();
    await save(page,'Select actual button later'); const captured=(await stored(page))[0]; expect(captured.tag).toBe('button');expect(captured.sourceScope).toBeUndefined();expect(captured.selector).toContain('card-beta');
  });
  test('location states update for hidden, changed, missing and ambiguous targets', async ({ page }) => {
    await page.evaluate(() => { const b=document.createElement('button'); b.id='status-target'; b.textContent='Original status target'; b.style.cssText='position:fixed;top:10px;left:10px'; document.body.append(b); });
    await activate(page); await page.locator('#status-target').click(); await save(page, 'Track target'); await notes(page);
    const state=page.locator('noktiq-toolbar .location-state'); await expect(state).toContainText('Target found');
    await page.locator('#status-target').evaluate(el => (el as HTMLElement).style.visibility='hidden'); await expect(state).toContainText('currently hidden');
    await page.locator('#status-target').evaluate(el => { (el as HTMLElement).style.visibility='visible'; el.textContent='Changed'; }); await expect(state).toContainText('has changed');
    await page.locator('#status-target').evaluate(el => el.remove()); await expect(state).toContainText('Target not found');
    await page.evaluate(() => { for(let n=0;n<2;n++){ const b=document.createElement('button'); b.id='status-target';b.textContent='Original status target';document.body.append(b); } });
    await expect(state).toContainText('Multiple matches found (2)'); await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(0);
  });
  test('rebinding commits only on save and keeps the original id and explanation', async ({ page }) => {
    await activate(page); await page.locator('[data-testid="card-alpha"] button').click({ position:{x:5,y:5} }); await save(page,'Keep this original request');
    const original=(await stored(page))[0]; await notes(page); await page.locator('noktiq-toolbar .note-details summary').click(); await page.getByRole('button',{name:'Rebind target',exact:true}).click();
    await expect(page.getByRole('button',{name:'Tools and settings'})).toBeDisabled();
    await page.keyboard.press('m');
    await page.locator('[data-testid="card-beta"] button').click({modifiers:['Shift'],position:{x:5,y:5}}); await expect(page.getByRole('textbox',{name:'What should change?'})).toHaveValue(original.note);
    await page.keyboard.press('Escape'); expect((await stored(page))[0]).toEqual(original);
    await activate(page); await notes(page); await page.locator('noktiq-toolbar .note-details summary').click(); await page.getByRole('button',{name:'Rebind target',exact:true}).click();
    await page.locator('#lab-mixed [data-noktiq-private]').click(); await expect(page.getByRole('textbox',{name:'What should change?'})).toBeHidden();
    await page.locator('[data-testid="card-beta"] button').click({position:{x:5,y:5}}); await save(page,original.note);
    const changed=(await stored(page))[0]; expect(changed.id).toBe(original.id); expect(changed.note).toBe(original.note); expect(changed.selector).toContain('card-beta');
    await page.reload(); await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
    await page.locator('noktiq-toolbar .pin').click(); await expect(page.locator('noktiq-toolbar code')).toContainText('card-beta');
  });
  test('a grouped note rebinds one target without changing the others', async ({ page }) => {
    await activate(page); for(const name of ['alpha','beta']) await page.locator(`[data-testid="card-${name}"] button`).click({modifiers:['Shift'],position:{x:5,y:5}});
    await page.getByRole('button',{name:'Annotate selection'}).click(); await save(page,'Shared explanation'); const original=(await stored(page))[0];
    await notes(page); await page.locator('noktiq-toolbar .note-details summary').click(); await page.getByRole('button',{name:'Rebind target 2',exact:true}).click(); await page.locator('#lab-text strong').click(); await save(page,original.note);
    const changed=(await stored(page))[0]; expect(changed.id).toBe(original.id); expect(changed.targets[0]).toEqual(original.targets[0]); expect(changed.targets[1].selector).toContain('lab-text');
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(2);
  });
  test('source buttons use the correct editor file and report request failures', async ({ page }) => {
    const requests: URL[]=[];
    await page.route('**/__open-in-editor?*', route => { requests.push(new URL(route.request().url())); return route.fulfill({status:204}); });
    await activate(page); await page.locator('[data-testid="card-beta"] button').click({position:{x:5,y:5}});
    const link=page.getByRole('button',{name:/^Open source file:/}); await link.click();
    await expect(page.locator('noktiq-toolbar .status')).toContainText('Editor request sent'); expect(requests).toHaveLength(1);
    expect(requests[0].searchParams.get('file')).toMatch(framework==='react'?/\/examples\/react\/lab-main\.tsx:9:\d+$/:/\/examples\/vue\/LabCard\.vue:6:\d+$/);
    await page.unroute('**/__open-in-editor?*'); await page.route('**/__open-in-editor?*',route=>route.fulfill({status:503})); await link.click();
    await expect(page.locator('noktiq-toolbar .status')).toContainText('Could not open the source'); await save(page,'Editor failure preserves note');
    const captured=(await stored(page))[0]; expect(captured.note).toBe('Editor failure preserves note'); expect(captured.editor.kind).toBe('vite');
  });
});

test('custom editor adapters receive the captured source and coordinates', async ({ page }) => {
  const core = await build({ entryPoints: ['src/index.ts'], bundle: true, write: false, format: 'esm', platform: 'browser' });
  await page.route('**/custom-editor-core.js', route => route.fulfill({contentType:'text/javascript',body:core.outputFiles[0].text}));
  await page.route('**/custom-editor.html', route => route.fulfill({contentType:'text/html',body:`<button id="custom-target" data-noktiq-source="src/Custom.tsx:8:4">Custom editor target</button><script type="module">import { mountNoktiq } from '/custom-editor-core.js'; window.editorCalls=[]; mountNoktiq({openInEditor: location => {window.editorCalls.push(location)}});</script>`}));
  await page.goto('http://127.0.0.1:5173/custom-editor.html'); await activate(page); await page.locator('#custom-target').click();
  await page.getByRole('button',{name:'Open source file: src/Custom.tsx:8:4',exact:true}).click();
  expect(await page.evaluate(() => (window as any).editorCalls)).toEqual([{file:'src/Custom.tsx',line:8,column:4,source:'src/Custom.tsx:8:4',page:'http://127.0.0.1:5173/custom-editor.html'}]);
});
