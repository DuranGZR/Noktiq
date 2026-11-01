import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/context.ts'], bundle: true, write: false, format: 'esm', platform: 'browser' });
async function activate(page: Page) { await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click(); }
async function save(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'What should change?' }).fill(text);
  await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
}
async function output(page: Page) {
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  return page.getByRole('textbox', { name: 'Output for your coding agent' }).inputValue();
}
for (const [framework, port] of [['react',5173], ['vue',5174]] as const) {
  test.describe(framework, () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Exercise manual output preview'); } } }));
    await page.goto(`http://127.0.0.1:${port}/lab.html`);
    await page.locator('noktiq-toolbar .brand').waitFor();
  });

  test(`${framework}: exported request resolves the exact repeated card and original source`, async ({ page }, info) => {
    const target = page.locator('[data-testid="card-beta"] button');
    await activate(page); await target.click({ position: { x: 5, y: 5 } }); await save(page, 'Yalnızca beta kartının düğmesini yeşil yap.');
    await expect(page.locator('#lab-live-status')).toContainText('0');
    const markdown = await output(page); const selector = /^Selector: (.+)$/m.exec(markdown)![1];
    await expect(page.locator(selector)).toHaveCount(1); expect(await page.locator(selector).evaluate(el => el.closest('article')?.getAttribute('data-testid'))).toBe('card-beta');
    const source = /^Source: (.+):(\d+):(\d+)$/m.exec(markdown)!; expect(source).not.toBeNull();
    expect(source[1]).toBe(framework === 'react' ? 'lab-main.tsx' : 'LabCard.vue');
    const file = resolve(`examples/${framework}`, source[1]); expect(file.startsWith(resolve(`examples/${framework}`))).toBeTruthy();
    const code = await readFile(file, 'utf8'); const line = code.split('\n')[Number(source[2]) - 1]; expect(line.slice(Number(source[3]) - 1)).toMatch(/^<button data-testid="repeated-action"/);
    expect(markdown).toContain('card-beta'); expect(markdown).not.toContain('GİZLİ-LAB-DEĞERİ');
    await info.attach(`${framework}-request.md`, { body: markdown, contentType: 'text/markdown' });
    await info.attach(`${framework}-resolved-source.txt`, { body: `${source[1]}:${source[2]}:${source[3]}\n${line}`, contentType: 'text/plain' });
    await page.keyboard.press('Escape'); await page.locator('#lab-reorder').click();
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
    await page.reload(); await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
  });

  test(`${framework}: identical top-level shadow children have exact selectors`, async ({ page }) => {
    const target = page.locator('#lab-shadow button').nth(1); await target.scrollIntoViewIfNeeded();
    await activate(page); await target.click(); await save(page, 'İkinci Shadow düğmesi.');
    const markdown = await output(page); const selector = /^Selector: (.+)$/m.exec(markdown)![1];
    const result = await page.locator('#lab-shadow').evaluate((host, selector) => {
      const matches = host.shadowRoot!.querySelectorAll(selector);
      return { count: matches.length, index: [...host.shadowRoot!.querySelectorAll('button')].indexOf(matches[0] as HTMLButtonElement) };
    }, selector);
    expect(result).toEqual({ count: 1, index: 1 });
    expect(markdown).toContain('Boundary path:'); expect(markdown).toContain('Source: unavailable');
    await page.reload(); await page.locator('#lab-shadow').scrollIntoViewIfNeeded();
    // Neither identical sibling has stable identity after recreation; retain the note without guessing.
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(0);
    await activate(page); await page.getByRole('button', { name: 'Show notes', exact: true }).click();
    await expect(page.getByText('İkinci Shadow düğmesi.', { exact: true })).toBeVisible();
  });

  test(`${framework}: multiline text retains the pin and can be reopened`, async ({ page }) => {
    await activate(page); await page.getByRole('button', { name: 'Tools and settings' }).click(); await page.getByLabel('Selection mode', { exact: true }).selectOption('text');
    await page.locator('#lab-text').evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element); const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range);
      element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
    await save(page, 'Bu üç satırın yazısını küçült.'); await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
    await page.reload(); await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
    await page.locator('noktiq-toolbar .pin').click(); await expect(page.getByRole('textbox', { name: 'What should change?' })).toHaveValue('Bu üç satırın yazısını küçült.');
  });

  test(`${framework}: grouped notes keep a pin on each surviving target`, async ({ page }) => {
    await activate(page);
    await page.locator('[data-testid="card-alpha"] button').click({ modifiers: ['Shift'], position: { x: 5, y: 5 } });
    await page.locator('[data-testid="card-beta"] button').click({ modifiers: ['Shift'], position: { x: 5, y: 5 } });
    await page.getByRole('button', { name: 'Annotate selection' }).click(); await save(page, 'İki kartın düğmeleri eşit olsun.');
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(2);
    await page.locator('[data-testid="card-alpha"]').evaluate(el => el.remove());
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
    await page.locator('noktiq-toolbar .pin').click();
    await expect(page.getByRole('textbox', { name: 'What should change?' })).toHaveValue('İki kartın düğmeleri eşit olsun.');
    await expect(page.locator('noktiq-toolbar code')).toContainText('card-beta');
  });

  test(`${framework}: scrolling a target out of its container hides the pin`, async ({ page }) => {
    const target = page.locator('[data-testid="row-0"] button'); await activate(page); await target.click(); await save(page, 'Birinci satırın düğmesi.');
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
    await page.locator('#lab-scroll').evaluate(el => { el.scrollTop = 120; });
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(0);
    await page.locator('#lab-scroll').evaluate(el => { el.scrollTop = 0; });
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
  });

  test(`${framework}: changing the identified ancestor cannot retarget a saved note`, async ({ page }) => {
    await page.route('**/lab-context.js', route => route.fulfill({ contentType: 'text/javascript', body: bundle.outputFiles[0].text }));
    const result = await page.evaluate(async () => {
      const { contextFor, matchesAnnotation, findAnnotatedElement } = await import('/lab-context.js');
      const card = document.querySelector('[data-testid="card-alpha"]')!, button = card.querySelector('button')!;
      const saved = { ...contextFor(button), id: 'scope-check', note: 'Alpha only' };
      card.setAttribute('data-testid', 'card-replaced');
      return { sameNode: matchesAnnotation(button, saved), relocated: !!findAnnotatedElement(document, saved) };
    });
    expect(result).toEqual({ sameNode: false, relocated: false });
  });
  });
}
