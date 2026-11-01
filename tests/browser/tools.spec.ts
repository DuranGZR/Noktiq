import { test, expect, type Page } from '@playwright/test';

async function start(page: Page, port: number) {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.getByRole('button', { name: 'Open Noktiq', exact: true }).click();
}
async function mode(page: Page, value: string) {
  await page.getByRole('button', { name: 'Tools and settings' }).click();
  await page.getByLabel('Selection mode', { exact: true }).selectOption(value);
}
async function save(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'What should change?' }).fill(text);
  await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();
}
async function copy(page: Page) {
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.locator('noktiq-toolbar .toast')).toContainText('copied');
  return page.evaluate(() => navigator.clipboard.readText());
}
for (const port of [5173, 5174]) {
  test(`${port}: sensitive text is rejected and Escape cancels an unfinished area`, async ({ page }) => {
    await start(page, port); await mode(page, 'text');
    await page.evaluate(() => {
      const p = document.createElement('p'); p.innerHTML = 'Public <span data-noktiq-private>private value</span>'; document.body.append(p);
      const range = document.createRange(); range.selectNodeContents(p); const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range);
      p.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
    await expect(page.getByRole('textbox', { name: 'What should change?' })).toBeHidden();
    await mode(page, 'area');
    await page.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5, buttons: 1 })));
    await page.mouse.move(80, 80); await page.keyboard.press('Escape'); await page.mouse.move(100, 100);
    await expect(page.locator('noktiq-toolbar .highlight:visible')).toHaveCount(0);
    await expect(page.locator('noktiq-toolbar .menu')).toBeHidden();
  });

  test(`${port}: exact text, computed styles and detailed output`, async ({ page }) => {
    await start(page, port);
    await page.evaluate(() => {
      const p = document.createElement('p'); p.id = 'selected-words'; p.textContent = 'Hello beautiful world';
      p.style.cssText = 'position:fixed;left:40px;top:40px;font-size:23px;padding:12px;color:rgb(20,30,40)'; document.body.append(p);
    });
    await mode(page, 'text');
    await page.locator('#selected-words').evaluate(p => {
      const range = document.createRange(); range.setStart(p.firstChild!, 6); range.setEnd(p.firstChild!, 15);
      const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range);
      p.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
    await expect(page.getByRole('textbox', { name: 'What should change?' })).toBeVisible();
    await page.getByText('Computed styles', { exact: true }).click();
    await expect(page.locator('noktiq-toolbar .style-details')).toContainText('font-size: 23px');
    await save(page, 'Replace only this word');
    await page.getByRole('button', { name: 'Tools and settings' }).click();
    await page.getByLabel('Output detail').selectOption('detailed');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    const output = await copy(page);
    expect(output).toContain('Selected text: "beautiful"'); expect(output).toContain('"start":6,"end":15');
    expect(output).toContain('"font-size":"23px"'); expect(output).toContain('Replace only this word');
  });

  for (const selection of ['multi', 'area']) test(`${port}: ${selection} selection exports each target with one shared request`, async ({ page }) => {
    await start(page, port);
    await page.evaluate(() => {
      const area = document.createElement('div'); area.id = 'group-area'; area.style.cssText = 'position:fixed;left:50px;top:80px;width:480px;height:130px;background:white;z-index:20';
      area.innerHTML = '<button id="card-one" style="position:absolute;left:30px;top:20px;width:140px;height:45px">First card</button><button id="card-two" style="position:absolute;left:230px;top:20px;width:140px;height:45px">Second card</button>';
      document.body.append(area);
    });
    await mode(page, selection);
    if (selection === 'multi') { await page.locator('#card-one').click(); await page.locator('#card-two').click(); }
    else { await page.mouse.move(65, 90); await page.mouse.down(); await page.mouse.move(440, 160, { steps: 8 }); await page.mouse.up(); }
    await page.getByRole('button', { name: 'Annotate selection' }).click();
    await save(page, 'Equalize their heights');
    const output = await copy(page);
    expect(output).toContain('(2 targets)'); expect(output).toContain('Selector: #card-one'); expect(output).toContain('Selector: #card-two');
    expect(output.match(/Requested change:/g)).toHaveLength(1);
  });

  test(`${port}: pin visibility, native animation pause and toolbar dragging`, async ({ page }) => {
    await start(page, port); await page.locator('#demo-cta').click(); await save(page, 'Change the CTA');
    await page.evaluate(() => {
      const target = document.createElement('div'); document.body.append(target);
      (window as any).running = target.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 10000, iterations: Infinity });
      (window as any).alreadyPaused = target.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 10000, iterations: Infinity });
      (window as any).alreadyPaused.pause();
    });
    await page.getByRole('button', { name: 'Tools and settings' }).click();
    await page.getByRole('button', { name: 'Hide pins', exact: true }).click();
    await expect(page.locator('noktiq-toolbar .pin')).toBeHidden();
    await page.getByRole('button', { name: 'Show pins', exact: true }).click();
    await expect(page.locator('noktiq-toolbar .pin')).toBeVisible();
    await page.getByRole('button', { name: 'Pause page motion', exact: true }).click();
    expect(await page.evaluate(() => (window as any).running.playState)).toBe('paused');
    await page.getByRole('button', { name: 'Resume page motion', exact: true }).click();
    expect(await page.evaluate(() => (window as any).running.playState)).toBe('running');
    expect(await page.evaluate(() => (window as any).alreadyPaused.playState)).toBe('paused');
    await page.keyboard.press('Escape');
    const mascot = page.getByRole('button', { name: 'Open Noktiq', exact: true }); const before = (await mascot.boundingBox())!;
    await page.mouse.move(before.x + 30, before.y + 30); await page.mouse.down(); await page.mouse.move(before.x - 170, before.y - 100, { steps: 10 }); await page.mouse.up();
    await expect(mascot).toHaveAttribute('aria-expanded', 'false');
    const after = (await mascot.boundingBox())!; expect(after.x).toBeLessThan(before.x - 100); expect(after.y).toBeLessThan(before.y - 50);
    await mascot.focus(); await page.keyboard.press('Shift+ArrowLeft'); expect((await mascot.boundingBox())!.x).toBeLessThan(after.x - 10);
  });

  test(`${port}: compact and source/class copy modes preserve meaningful context`, async ({ page }) => {
    await start(page, port);
    await page.locator('#demo-cta').evaluate(element => element.classList.add('test-cta', 'primary'));
    await page.locator('#demo-cta').click(); await save(page, 'Change CTA');
    await page.getByRole('button', { name: 'Tools and settings' }).click(); await page.getByLabel('Output detail').selectOption('compact');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    const compact = await copy(page); expect(compact).toContain('Selector: #demo-cta'); expect(compact).not.toContain('Viewport:');
    await page.getByRole('button', { name: 'Tools and settings' }).click(); await page.getByLabel('Copy format').selectOption('source');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    expect(await copy(page)).toMatch(/(?:main\.tsx|App\.vue):\d+:\d+/);
    await page.getByRole('button', { name: 'Tools and settings' }).click(); await page.getByLabel('Copy format').selectOption('classes');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    const expected = await page.locator('#demo-cta').getAttribute('class');
    expect((await copy(page)).split(/\r?\n/)).toEqual([...new Set(expected!.split(/\s+/))]);
  });
}
