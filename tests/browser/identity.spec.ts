import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const bundle = await build({ entryPoints: ['src/context.ts'], bundle: true, write: false, format: 'esm', platform: 'browser' });
const identityCode = bundle.outputFiles[0].text;

for (const [framework, port] of [['React', 5173], ['Vue', 5174]] as const) {
  test(`${framework}: real nested components, identifiers and exact source are exported`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/identity.html`);
    await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click();
    await page.locator('button[data-testid="checkout-pay"]').first().click({ position: { x: 6, y: 6 } });
    await page.getByRole('textbox', { name: 'What should change?' }).fill('Only this payment button.');
    await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(`noktiq:v1:${location.origin}${location.pathname}`)!)[0]);
    expect(saved.components.framework).toBe(framework.toLowerCase());
    expect(saved.components.names).toContain('PaymentForm');
    expect(saved.components.names).toContain('PaymentButton');
    expect(saved.identifiers).toEqual({ 'data-testid': 'checkout-pay' });
    expect(saved.classes).toContain('pay-button');
    expect(saved.label).toBe('Complete payment');
    expect(saved.sourceScope).toBeUndefined();
    expect(saved.source).toMatch(/:\d+:\d+$/);
    const [fileName, line, column] = saved.source.split(':');
    const source = await readFile(`examples/${framework.toLowerCase()}/${fileName}`, 'utf8');
    expect(source.split('\n')[Number(line) - 1].slice(Number(column) - 1)).toMatch(/^<button/);
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
    await page.getByRole('button', { name: 'Show notes', exact: true }).click();
    await page.getByRole('button', { name: 'Copy all notes', exact: true }).click();
    const output = await page.getByRole('textbox', { name: 'Output for your coding agent' }).inputValue();
    expect(output).not.toContain('components:');
    expect(output).not.toContain('Component file:');
    expect(output).toContain(`Source: ${saved.source}`);
    expect(output).toContain('"data-testid":"checkout-pay"');
    await page.getByRole('button', { name: 'Tools and settings' }).click();
    await page.getByLabel('Output detail').selectOption('detailed');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Show notes', exact: true }).click();
    await page.getByRole('button', { name: 'Copy all notes', exact: true }).click();
    const detailed = await page.getByRole('textbox', { name: 'Output for your coding agent' }).inputValue();
    expect(detailed).toContain(`${framework} components:`);
    expect(detailed).toContain('"PaymentButton"');
    expect(detailed).toContain(`Source: ${saved.source}`);
    await page.reload();
    // Both rendered buttons have identical evidence. Keep the note, rather than guess a pin target.
    await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(0);
    await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click();
    await page.getByRole('button', { name: 'Show notes', exact: true }).click();
    await expect(page.getByText('Only this payment button.', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('selectors remain exact with duplicate attributes, escaped values and scoped identifiers', async ({ page }) => {
  await page.route('**/identity-tools.js', route => route.fulfill({ contentType: 'text/javascript', body: identityCode }));
  await page.goto('http://127.0.0.1:5173/');
  const result = await page.evaluate(async (modulePath) => {
    const { contextFor, selectorFor, findAnnotatedElement } = await import(modulePath);
    const sandbox = document.createElement('div'); sandbox.id = 'identity-sandbox'; document.body.append(sandbox);
    const a = document.createElement('button'); const b = document.createElement('button');
    a.id = b.id = 'duplicate'; a.dataset.testid = b.dataset.testid = 'repeated'; sandbox.append(a, b);
    const duplicateSelectors = [a, b].every(element => document.querySelectorAll(selectorFor(element)).length === 1 && document.querySelector(selectorFor(element)) === element);
    a.dataset.testid = 'pay "[QA] ü\\ value';
    const escapedSelector = selectorFor(a);
    const escaped = document.querySelector(escapedSelector) === a && escapedSelector.includes('data-testid');
    const cards = document.createElement('div');
    cards.innerHTML = '<article data-testid="card-a"><button data-testid="pay">Buy</button></article><article data-testid="card-b"><button data-testid="pay">Buy</button></article>';
    sandbox.append(cards);
    const target = cards.querySelector('[data-testid="card-b"] button')!;
    const snapshot = { ...contextFor(target), id: 'card-b-note', note: 'This card only' };
    cards.prepend(cards.lastElementChild!);
    const reordered = findAnnotatedElement(document, snapshot) === target;
    const clone = target.cloneNode(true); target.replaceWith(clone);
    const remounted = findAnnotatedElement(document, snapshot) === clone;
    return { duplicateSelectors, escaped, reordered, remounted, strategy: snapshot.selectorStrategy };
  }, '/identity-tools.js');
  expect(result).toEqual({ duplicateSelectors: true, escaped: true, reordered: true, remounted: true, strategy: 'identity' });
});

test('stale structural selectors relocate only unique evidence and never choose an ambiguous element', async ({ page }) => {
  await page.route('**/identity-tools.js', route => route.fulfill({ contentType: 'text/javascript', body: identityCode }));
  await page.goto('http://127.0.0.1:5173/');
  const result = await page.evaluate(async (modulePath) => {
    const { contextFor, findAnnotatedElement } = await import(modulePath);
    const parent = document.createElement('div');
    parent.innerHTML = '<button data-noktiq-source="src/Loop.tsx:9:3">First</button><button data-noktiq-source="src/Loop.tsx:9:3">Second</button>';
    document.body.append(parent);
    const target = parent.lastElementChild!;
    const snapshot = { ...contextFor(target), id: 'second-note', note: 'Second only' };
    const first = parent.firstElementChild!;
    parent.append(first);
    const moved = findAnnotatedElement(document, snapshot) === target;
    const twin = target.cloneNode(true); parent.append(twin);
    const ambiguous = findAnnotatedElement(document, snapshot) === undefined;
    const child = document.createElement('span'); child.textContent = 'Dynamic child'; target.append(child);
    const childContext = contextFor(child);
    const sensitive = document.createElement('input'); sensitive.value = 'PRIVATE_VALUE'; sensitive.setAttribute('aria-label', 'PRIVATE_LABEL'); parent.append(sensitive);
    const privateContext = contextFor(sensitive);
    return { moved, ambiguous, source: childContext.source, scope: childContext.sourceScope, privateText: privateContext.text, privateLabel: privateContext.label };
  }, '/identity-tools.js');
  expect(result).toEqual({ moved: true, ambiguous: true, source: 'src/Loop.tsx:9:3', scope: 'button', privateText: '', privateLabel: undefined });
});

test('a reused DOM node with changed identity loses its pin without losing the saved note', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click();
  await page.locator('#demo-cta').click({ position: { x: 12, y: 12 } });
  await page.getByRole('textbox', { name: 'What should change?' }).fill('Original item only.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
  await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(1);
  await page.locator('#demo-cta').evaluate(element => { element.id = 'different-item'; });
  await expect(page.locator('noktiq-toolbar .pin')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show notes', exact: true }).click();
  await expect(page.getByText('Original item only.', { exact: true })).toBeVisible();
});
