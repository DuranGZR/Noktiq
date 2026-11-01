import { test, expect } from '@playwright/test';
for (const [framework, port] of [['react',5173], ['vue',5174]] as const) test.describe(framework, () => {
  test.beforeEach(async ({ page }) => { await page.goto(`http://127.0.0.1:${port}/lab.html`); await page.locator('noktiq-toolbar .brand').waitFor(); });
  test('native modal supports focus, save and reopening', async ({ page }) => {
    await page.locator('#lab-open-modal').click(); await expect(page.locator('dialog noktiq-toolbar')).toHaveCount(1);
    await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click(); await page.locator('#lab-modal-target').click();
    const input = page.getByRole('textbox', { name: 'What should change?' }); await expect(input).toBeFocused(); await input.fill('Modal target');
    await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden(); await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
    await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelector('dialog')?.close());
    await expect(page.locator('body > noktiq-toolbar')).toHaveCount(1); await page.locator('#lab-open-modal').click();
    await expect(page.locator('dialog noktiq-toolbar')).toHaveCount(1); await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
  });
  test('iframe events select the child and output a usable boundary path', async ({ page }, info) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('preview'); } } }));
    await page.reload(); await page.locator('#lab-frame').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click(); await page.frameLocator('#lab-frame').locator('#frame-action').click();
    await page.getByRole('textbox', { name: 'What should change?' }).fill('Change only the framed button');
    await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden(); await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    const markdown = await page.getByRole('textbox', { name: 'Output for your coding agent' }).inputValue();
    expect(markdown).toContain('Selector: #frame-action'); expect(markdown).toContain('"kind":"frame","selector":"#lab-frame"'); expect(markdown).toContain('Source: unavailable');
    await info.attach('iframe-request.md', { body: markdown, contentType: 'text/markdown' });
    await page.keyboard.press('Escape');
    await page.locator('#lab-frame').evaluate(frame => { (frame as HTMLIFrameElement).srcdoc = '<button id="frame-action">New frame document</button>'; });
    await page.frameLocator('#lab-frame').getByText('New frame document').waitFor();
    await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click();
    await page.frameLocator('#lab-frame').locator('#frame-action').click();
    await page.getByRole('textbox', { name: 'What should change?' }).fill('The new document only');
    await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
  });
  test('pausing motion preserves pre-existing paused animations', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(() => {
      const node = document.querySelector('h1')!;
      (window as any).playing = node.animate([{ opacity: .9 }, { opacity: 1 }], { duration: 10000, iterations: Infinity });
      (window as any).paused = node.animate([{ transform: 'none' }, { transform: 'translateX(1px)' }], { duration: 10000, iterations: Infinity });
      (window as any).paused.pause();
    });
    await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click(); await page.keyboard.press('p');
    expect(await page.evaluate(() => (window as any).playing.playState)).toBe('paused');
    await page.keyboard.press('p'); expect(await page.evaluate(() => (window as any).playing.playState)).toBe('running');
    expect(await page.evaluate(() => (window as any).paused.playState)).toBe('paused'); expect(errors).toEqual([]);
  });
  test('320px layout and keyboard typing remain usable', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click();
    await page.getByRole('button', { name: 'Tools and settings' }).click();
    const panel = page.locator('noktiq-toolbar .panel'); const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(320);
    expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.locator('[data-testid="card-alpha"] button').click();
    await page.getByRole('textbox', { name: 'What should change?' }).fill('mapche');
    await page.getByRole('textbox', { name: 'What should change?' }).pressSequentially('mapche');
    await expect(page.getByRole('textbox', { name: 'What should change?' })).toHaveValue('mapchemapche');
    await expect(page.locator('noktiq-toolbar .menu')).toBeVisible();
  });
});

test('5,000 additional elements keep selection and source output responsive', async ({ page }, info) => {
  await page.goto('http://127.0.0.1:5173/lab.html');
  await page.locator('noktiq-toolbar .brand').waitFor();
  await page.evaluate(() => {
    const sandbox = document.createElement('section'); sandbox.id = 'performance-sandbox';
    const fragment = document.createDocumentFragment();
    for (let n = 0; n < 5000; n++) { const button = document.createElement('button'); button.textContent = `Performance ${n}`; if (n === 0) button.id = 'performance-target'; fragment.append(button); }
    sandbox.append(fragment); document.body.prepend(sandbox);
  });
  await page.locator('#performance-target').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click();
  const start = Date.now(); await page.locator('#performance-target').click();
  await expect(page.getByRole('textbox', { name: 'What should change?' })).toBeVisible(); const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(2500);
  await info.attach('selection-latency.json', { body: JSON.stringify({ addedElements: 5000, selectionToEditorMs: elapsed, budgetMs: 2500 }), contentType: 'application/json' });
});
