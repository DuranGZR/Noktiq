import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function openMenu(page: Page) {
  const menu = page.locator('noktiq-toolbar .menu');
  if (!await menu.isVisible()) await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click();
  await expect(menu).toBeVisible();
}

async function addNote(page: Page, selector: string, note: string) {
  await openMenu(page);
  const selection = page.getByRole('button', { name: /^(Select|Selecting)$/ });
  if (await selection.getAttribute('aria-pressed') !== 'true') await selection.click();
  await page.locator(selector).click({ position: { x: 12, y: 12 } });
  await page.getByRole('textbox', { name: 'What should change?' }).fill(note);
  await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
}

for (const [framework, port, sourceFile] of [['React', 5173, 'main.tsx'], ['Vue', 5174, 'App.vue']] as const) {
  const url = `http://127.0.0.1:${port}`;
  test(`${framework}: select, annotate, edit, reload, export, delete`, async ({ page, context }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(url + '/?token=TOP_SECRET#SECRET');
    await expect(page.locator('noktiq-toolbar')).toHaveCount(1);
    expect(await page.locator('noktiq-toolbar .dock').evaluate(node => getComputedStyle(node).fontFamily)).toContain('ui-sans-serif');
    expect(await page.locator('noktiq-toolbar .brand').evaluate(node => getComputedStyle(node).color)).toBe('rgb(48, 51, 47)');
    await page.locator('#demo-cta').click({ position: { x: 12, y: 12 } });
    await expect(page.locator('#click-count')).toHaveText('Normal tıklama: 1');
    await addNote(page, '#hero-title', 'Başlığı biraz küçült.');
    await addNote(page, '#demo-cta', 'Arka planı pembe yap.');
    await expect(page.locator('#click-count')).toHaveText('Normal tıklama: 1');
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(2);
    await page.locator('noktiq-toolbar .pin').first().click();
    await page.getByRole('textbox', { name: 'What should change?' }).fill('Başlığı 32 piksel yap.');
    await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
    await page.reload();
    await openMenu(page);
    await page.getByRole('button', { name: 'Show notes', exact: true }).click();
    await expect(page.getByText('Başlığı 32 piksel yap.', { exact: true })).toBeVisible();
    await page.locator('noktiq-toolbar .menu').getByRole('button', { name: 'Copy', exact: true }).click();
    const output = await page.getByRole('textbox', { name: 'Output for your coding agent' }).inputValue();
    expect(output).toContain('Selector: #hero-title');
    expect(output).toContain('Selector: #demo-cta');
    expect(output).toContain('Viewport: 1440 × 1000');
    expect(output).not.toContain('TOP_SECRET');
    expect(output).not.toContain('#SECRET');
    const source = await page.locator('#hero-title').getAttribute('data-noktiq-source');
    expect(output).toContain(`Source: ${source}`);
    const [, line, column] = source!.match(/:(\d+):(\d+)$/)!;
    const file = await readFile(`examples/${framework.toLowerCase()}/${sourceFile}`, 'utf8');
    expect(file.split('\n')[Number(line) - 1].slice(Number(column) - 1)).toMatch(/^<h2 id="hero-title"/);
    await expect.poll(() => page.evaluate(async () => (await navigator.clipboard.readText()).replaceAll('\r\n', '\n'))).toBe(output);
    await page.getByRole('button', { name: 'Back to notes', exact: true }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
    await page.screenshot({ path: `test-results/${framework.toLowerCase()}-annotated.png`, fullPage: true });
    expect(errors).toEqual([]);
  });

  test(`${framework}: clipboard denial, storage denial and private values`, async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) } });
    });
    await page.goto(url);
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'sensitive-test';
      container.innerHTML = '<p>Public label</p><textarea>PRIVATE_TEXT</textarea><input value="PRIVATE_VALUE"><span data-noktiq-private>PRIVATE_REGION</span>';
      document.querySelector('.hero')!.append(container);
    });
    await addNote(page, '#sensitive-test', '<img src=x onerror=alert(1)>');
    await expect(page.getByRole('status')).toContainText('Browser storage is unavailable');
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ctrl/Cmd+C');
    const output = await page.getByRole('textbox', { name: 'Output for your coding agent' }).inputValue();
    expect(output).toContain('Public label');
    expect(output).not.toContain('PRIVATE_');
    expect(output).toContain('<img src=x onerror=alert(1)>');
    await expect(page.locator('noktiq-toolbar img')).toHaveCount(0);
  });

  test(`${framework}: duplicate IDs, SPA routes, Escape and mobile layout`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    await page.evaluate(() => {
      const button = document.createElement('button'); button.id = 'demo-cta'; button.textContent = 'Duplicate ID';
      document.querySelector('.hero')!.append(button);
    });
    await addNote(page, '#demo-cta:first-of-type', 'İlk butonu değiştir.');
    await page.getByRole('button', { name: 'Show notes', exact: true }).click();
    await page.getByRole('button', { name: 'Copy all notes', exact: true }).click();
    const output = await page.getByRole('textbox', { name: 'Output for your coding agent' }).inputValue();
    const selector = output.match(/Selector: (.+)/)![1];
    expect(await page.evaluate(selector => document.querySelectorAll(selector).length, selector)).toBe(1);
    const panel = page.locator('noktiq-toolbar .panel');
    const rect = (await panel.boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.x + rect.width).toBeLessThanOrEqual(390);
    await page.evaluate(() => history.pushState({}, '', '/another'));
    await expect(page.locator('noktiq-toolbar .menu-count')).toHaveText('0');
    await page.evaluate(() => history.back());
    await expect(page.locator('noktiq-toolbar .menu-count')).toHaveText('1');
    await page.getByRole('button', { name: /^(Select|Selecting)$/ }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('noktiq-toolbar .hint')).toBeHidden();
    await page.screenshot({ path: `test-results/${framework.toLowerCase()}-mobile.png`, fullPage: true });
  });

  test(`${framework}: production has no toolbar or source attributes`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:${port + 2}`);
    await expect(page.locator('#hero-title')).toBeVisible();
    await expect(page.locator('noktiq-toolbar')).toHaveCount(0);
    await expect(page.locator('[data-noktiq-source]')).toHaveCount(0);
  });

  test(`${framework}: notes toggle, individual copy and clear all persist correctly`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(url);
    await addNote(page, '#hero-title', 'Sadece başlığın notu.');
    await addNote(page, '#demo-cta', 'Sadece butonun notu.');
    const notesButton = page.getByRole('button', { name: 'Show notes', exact: true });
    const panel = page.locator('noktiq-toolbar .panel');
    await notesButton.click();
    await expect(panel).toBeVisible();
    await notesButton.click();
    await expect(panel).toBeHidden();
    await expect(page.locator('noktiq-toolbar .hint')).toBeVisible();
    await notesButton.click();
    const rows = panel.locator('.row');
    await expect(rows).toHaveCount(2);
    await rows.last().getByRole('button', { name: 'Copy', exact: true }).click();
    const output = await page.getByRole('textbox', { name: 'Output for your coding agent' }).inputValue();
    expect(output).toContain('Sadece butonun notu.');
    expect(output).toContain('Selector: #demo-cta');
    expect(output).toMatch(/Source: (main.tsx|App.vue):\d+:\d+/);
    expect(output).not.toContain('Sadece başlığın notu.');
    expect(output).not.toContain('Selector: #hero-title');
    await expect.poll(() => page.evaluate(async () => (await navigator.clipboard.readText()).replaceAll('\r\n', '\n'))).toBe(output);
    await expect(page.getByRole('status')).toContainText('1 note copied');
    await page.getByRole('button', { name: 'Back to notes', exact: true }).click();
    await expect(rows).toHaveCount(2);
    await page.screenshot({ path: `test-results/${framework.toLowerCase()}-note-actions.png`, fullPage: true });
    await page.getByRole('button', { name: 'Clear all', exact: true }).click();
    await expect(rows).toHaveCount(0);
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(0);
    await expect(page.locator('noktiq-toolbar .menu-count')).toHaveText('0');
    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeDisabled();
    await page.reload();
    await openMenu(page);
    await notesButton.click();
    await expect(rows).toHaveCount(0);
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(0);
  });

  test(`${framework}: mascot directly toggles selection, saving leaves pins and keeps notes private`, async ({ page }) => {
    await page.goto(url);
    const launcher = page.getByRole('button', { name: 'Open Noktiq', exact: true });
    const panel = page.locator('noktiq-toolbar .panel');
    await launcher.click();
    await expect(page.getByRole('button', { name: 'Selecting', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(panel).toBeHidden();
    const target = page.locator('#hero-title');
    await target.click({ position: { x: 28, y: 24 } });
    await page.getByRole('textbox', { name: 'What should change?' }).fill('Birinci not.');
    await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
    await expect(panel).toBeHidden();
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
    await expect(page.locator('noktiq-toolbar .hint')).toBeVisible();
    const rect = (await target.boundingBox())!;
    const pin = (await page.locator('noktiq-toolbar .pin').boundingBox())!;
    expect(Math.abs(pin.x + pin.width / 2 - rect.x - 28)).toBeLessThan(2);
    expect(Math.abs(pin.y + pin.height / 2 - rect.y - 24)).toBeLessThan(2);
    await addNote(page, '#demo-cta', 'İkinci not.');
    await expect(panel).toBeHidden();
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(2);
    await launcher.click();
    await expect(page.locator('noktiq-toolbar .menu')).toBeHidden();
    await expect(page.locator('noktiq-toolbar .hint')).toBeHidden();
    await page.locator('#demo-cta').click({ position: { x: 50, y: 20 } });
    await expect(page.locator('#click-count')).toHaveText('Normal tıklama: 1');
    await page.locator('noktiq-toolbar .pin').first().click();
    await expect(page.getByRole('textbox', { name: 'What should change?' })).toHaveValue('Birinci not.');
    await page.getByRole('textbox', { name: 'What should change?' }).fill('Düzenlenmiş not.');
    await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
    await expect(panel).toBeHidden();
    await target.click({ position: { x: 80, y: 30 } });
    await page.getByRole('textbox', { name: 'What should change?' }).fill('Kaydedilmemiş taslak.');
    await launcher.click();
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    await expect(panel).toBeHidden();
    await expect(page.locator('noktiq-toolbar .highlight:visible')).toHaveCount(0);
    await launcher.click();
    await expect(page.getByRole('textbox', { name: 'What should change?' })).toHaveValue('Kaydedilmemiş taslak.');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(panel).toBeHidden();
    await page.getByRole('button', { name: 'Show notes', exact: true }).click();
    await expect(page.getByText('Düzenlenmiş not.', { exact: true })).toBeVisible();
    await expect(page.getByText('İkinci not.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(panel).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(page.locator('noktiq-toolbar .menu')).toBeHidden();
    await page.reload();
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(2);
    await expect(panel).toBeHidden();
    const restored = (await page.locator('noktiq-toolbar .pin').first().boundingBox())!;
    expect(Math.abs(restored.x + restored.width / 2 - rect.x - 28)).toBeLessThan(2);
    await page.screenshot({ path: `test-results/${framework.toLowerCase()}-selection-pins.png`, fullPage: true });
  });

  test(`${framework}: Nok reacts to selection and only celebrates completed copying`, async ({ page }) => {
    await page.addInitScript(() => {
      const fixture = window as Window & { finishCopy?: () => void; exported?: string };
      Object.defineProperty(navigator, 'clipboard', { value: {
        writeText: (text: string) => new Promise<void>(resolve => { fixture.exported = text; fixture.finishCopy = resolve; }),
      } });
    });
    await page.goto(url);
    const dock = page.locator('noktiq-toolbar .dock');
    const launcher = page.getByRole('button', { name: 'Open Noktiq', exact: true });
    await expect(page.locator('noktiq-toolbar .menu')).toBeHidden();
    await page.locator('#demo-cta').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#demo-cta')).toBeFocused();
    await openMenu(page);
    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeDisabled();
    const mascot = (await launcher.boundingBox())!;
    await page.mouse.move(mascot.x - 55, mascot.y + 10);
    await expect.poll(() => dock.evaluate(node => node.style.getPropertyValue('--gaze-x'))).not.toBe('0px');
    await expect(dock).toHaveAttribute('data-mood', 'selecting');
    await page.locator('#demo-cta').click({ position: { x: 12, y: 12 } });
    await expect(dock).toHaveAttribute('data-mood', 'writing');
    const editor = (await page.locator('noktiq-toolbar .panel').boundingBox())!;
    const selected = (await page.locator('#demo-cta').boundingBox())!;
    expect(Math.abs(editor.x - selected.x - selected.width)).toBeLessThan(30);
    await page.getByRole('textbox', { name: 'What should change?' }).fill('Butonu mercan rengi yap.');
    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
    await expect(dock).toHaveAttribute('data-mood', 'saved');
    await page.locator('noktiq-toolbar .pin').evaluate(node => { (node as HTMLElement).dataset.probe = 'preserved'; });
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    await expect(page.locator('noktiq-toolbar .pin')).toHaveAttribute('data-probe', 'preserved');
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect(dock).toHaveAttribute('data-mood', 'copying');
    await expect(page.getByRole('button', { name: 'Copying', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Selecting', exact: true })).toBeDisabled();
    await expect(page.locator('noktiq-toolbar .toast')).toBeHidden();
    await page.evaluate(() => (window as Window & { finishCopy: () => void }).finishCopy());
    await expect(dock).toHaveAttribute('data-mood', 'copied');
    await expect(page.locator('noktiq-toolbar .toast')).toContainText('1 note copied');
    await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
    expect(await page.evaluate(() => (window as Window & { exported: string }).exported)).toContain('Selector: #demo-cta');
    await page.screenshot({ path: `test-results/${framework.toLowerCase()}-nok-copied.png`, fullPage: true });
  });

  test(`${framework}: reduced motion and anchored editor stay usable on small screens`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(url);
    await openMenu(page);
    expect(await page.locator('noktiq-toolbar .nok-blink').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
    expect(await page.locator('noktiq-toolbar .menu').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
    const menu = (await page.locator('noktiq-toolbar .menu').boundingBox())!;
    expect(menu.x).toBeGreaterThanOrEqual(0);
    await page.evaluate(() => {
      const target = document.createElement('button');
      target.id = 'edge-target'; target.textContent = 'Edge';
      target.style.cssText = 'position:fixed;right:12px;top:20px';
      document.body.append(target);
    });
    await page.locator('#edge-target').click();
    await page.getByRole('textbox', { name: 'What should change?' }).fill('Bu not kaybolmasın.');
    await page.keyboard.press('Escape');
    await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
    await openMenu(page);
    await expect(page.getByRole('textbox', { name: 'What should change?' })).toHaveValue('Bu not kaybolmasın.');
    await page.getByRole('textbox', { name: 'What should change?' }).evaluate(node => { node.style.height = '420px'; });
    await expect.poll(async () => {
      const rect = (await page.locator('noktiq-toolbar .panel').boundingBox())!;
      return rect.y + rect.height;
    }).toBeLessThanOrEqual(700);
    const panel = (await page.locator('noktiq-toolbar .panel').boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(320);
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.y + panel.height).toBeLessThanOrEqual(700);
    await page.screenshot({ path: `test-results/${framework.toLowerCase()}-nok-editor-mobile.png`, fullPage: true });
  });
}

test('shared core cleans up and reference-counts multiple mounts', async ({ page }) => {
  await page.route('**/lifecycle.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><h1>Lifecycle fixture</h1></body></html>' }));
  await page.goto('http://127.0.0.1:5173/lifecycle.html');
  const result = await page.evaluate(async (modulePath) => {
    const { mountNoktiq } = await import(/* @vite-ignore */ modulePath);
    const one = mountNoktiq(); const two = mountNoktiq();
    const count = () => document.querySelectorAll('noktiq-toolbar').length;
    const counts = [count()]; one(); one(); counts.push(count()); two(); counts.push(count());
    const again = mountNoktiq(); counts.push(count()); again(); counts.push(count());
    return counts;
  }, '/@fs/' + resolve('dist/index.js').replaceAll('\\', '/'));
  expect(result).toEqual([1, 1, 0, 1, 0]);
});
