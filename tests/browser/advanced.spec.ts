import { test, expect, type Page } from '@playwright/test';

async function activate(page: Page) {
  if (!await page.locator('noktiq-toolbar .menu').isVisible()) await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click();
}
async function save(page: Page, note: string) {
  await page.getByRole('textbox', { name: 'What should change?' }).fill(note);
  await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
}

for (const port of [5173, 5174]) {
  test(`${port}: dialogs inside an open shadow root keep the editor focusable`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.evaluate(() => {
      const host = document.createElement('div'); host.id = 'shadow-modal'; document.body.append(host);
      const shadow = host.attachShadow({ mode: 'open' }); const dialog = document.createElement('dialog');
      dialog.innerHTML = '<button id="shadow-modal-action">Shadow modal action</button>'; shadow.append(dialog); dialog.showModal();
    });
    await expect(page.locator('#shadow-modal dialog noktiq-toolbar')).toHaveCount(1);
    await activate(page); await page.locator('#shadow-modal-action').click();
    await expect(page.getByRole('textbox', { name: 'What should change?' })).toBeFocused();
  });

  test(`${port}: native modal keeps Nok and the draft inside its focus boundary`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.evaluate(() => {
      const dialog = document.createElement('dialog'); dialog.id = 'test-modal';
      dialog.innerHTML = '<h2>Modal heading</h2><button id="modal-action">Modal action</button>';
      document.body.append(dialog); dialog.showModal();
    });
    await expect(page.locator('#test-modal noktiq-toolbar')).toHaveCount(1);
    await activate(page);
    await page.locator('#modal-action').click();
    await page.getByRole('textbox', { name: 'What should change?' }).fill('Keep modal draft');
    await expect(page.getByRole('textbox', { name: 'What should change?' })).toBeFocused();
    await page.evaluate(() => (document.querySelector('#test-modal') as HTMLDialogElement).close());
    await expect(page.locator('body > noktiq-toolbar')).toHaveCount(1);
    await expect(page.getByRole('textbox', { name: 'What should change?' })).toHaveValue('Keep modal draft');
  });

  test(`${port}: nested shadow/frame locators and scaled pins survive reload`, async ({ page }) => {
    await page.addInitScript(() => window.addEventListener('DOMContentLoaded', () => {
      if (window !== window.top) return;
      const host = document.createElement('section'); host.id = 'shadow-fixture';
      const root = host.attachShadow({ mode: 'open' });
      root.innerHTML = '<iframe id="frame-fixture" style="width:400px;height:200px;border:4px solid;transform:scale(.8);transform-origin:top left" srcdoc="<button id=frame-target style=margin:30px;padding:20px>Frame button</button>"></iframe>';
      document.body.prepend(host);
    }));
    await page.goto(`http://127.0.0.1:${port}/`);
    await activate(page);
    const target = page.frameLocator('#frame-fixture').locator('#frame-target');
    await target.click(); await save(page, 'Inside a scaled frame');
    const expected = (await target.boundingBox())!;
    const pin = page.locator('noktiq-toolbar .pin');
    await expect(pin).toHaveCount(1);
    const actual = (await pin.boundingBox())!;
    expect(Math.abs(actual.x + actual.width / 2 - expected.x - expected.width / 2)).toBeLessThan(3);
    await page.reload(); await expect(pin).toHaveCount(1);
    await activate(page); await page.getByRole('button', { name: 'Show notes', exact: true }).click();
    await page.getByRole('button', { name: 'Copy all notes', exact: true }).click();
    const output = await page.getByRole('textbox', { name: 'Output for your coding agent' }).inputValue();
    expect(output).toContain('"kind":"shadow"'); expect(output).toContain('"kind":"frame"');
    await page.locator('#frame-fixture').evaluate(node => { (node as HTMLIFrameElement).srcdoc = '<p>Another frame page</p>'; });
    await expect(pin).toHaveCount(0);
  });

  test(`${port}: hash routes use separate buckets and never export URL secrets`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:${port}/#/first?token=PRIVATE`);
    await activate(page); await page.locator('#demo-cta').click({ position: { x: 12, y: 12 } }); await save(page, 'First route');
    await page.evaluate(() => history.pushState({}, '', '#/second'));
    await expect(page.locator('noktiq-toolbar .menu-count')).toHaveText('0');
    await page.evaluate(() => history.back());
    await expect(page.locator('noktiq-toolbar .menu-count')).toHaveText('1');
    await page.getByRole('button', { name: 'Show notes', exact: true }).click();
    await page.getByRole('button', { name: 'Copy all notes', exact: true }).click();
    const output = await page.getByRole('textbox', { name: 'Output for your coding agent' }).inputValue();
    expect(output).toContain('#/first'); expect(output).not.toContain('PRIVATE');
  });
}
