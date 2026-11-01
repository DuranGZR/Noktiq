import { test, expect, type Page, type Locator } from '@playwright/test';

const toolbar=(page:Page)=>page.locator('noktiq-toolbar');
const brand=(page:Page)=>toolbar(page).locator('.brand');
async function inside(locator:Locator,page:Page){const rect=(await locator.boundingBox())!;expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.y).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);expect(rect.y+rect.height).toBeLessThanOrEqual(page.viewportSize()!.height+1)}
async function annotate(page:Page,selector:string,note:string){await page.locator(selector).click();await page.getByRole('textbox',{name:'What should change?'}).fill(note);await page.getByRole('button',{name:'Save note',exact:true}).click(); await expect(page.locator('noktiq-toolbar .panel')).toBeHidden();}

for(const [framework,port] of [['react',5173],['vue',5174]] as const){
  test(`${framework}: dragging preserves the mascot anchor and keeps menus/panels inside every corner`,async({page})=>{
    await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}}));
    await page.goto(`http://127.0.0.1:${port}`);
    await brand(page).click();await annotate(page,'#demo-cta','Keep the copy confirmation in view');await page.keyboard.press('Escape');
    for(const [x,y] of [[45,50],[1390,50],[45,940],[1390,940]]){
      const before=(await brand(page).boundingBox())!;
      await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();await page.mouse.move(x,y,{steps:18});
      await expect(toolbar(page).locator('.dock')).toHaveAttribute('data-dragging','true');await page.mouse.up();
      await expect(brand(page)).toHaveAttribute('aria-expanded','false');await inside(brand(page),page);
      const anchor=(await brand(page).boundingBox())!;await brand(page).click();await expect(toolbar(page).locator('.menu')).toBeVisible();
      await expect.poll(async()=>Math.abs((await brand(page).boundingBox())!.x-anchor.x)).toBeLessThan(1);
      await inside(toolbar(page).locator('.menu'),page);
      await toolbar(page).locator('.menu').getByRole('button',{name:'Copy',exact:true}).click();await expect(toolbar(page).locator('.toast')).toBeVisible();await inside(toolbar(page).locator('.toast'),page);
      await page.getByRole('button',{name:'Show notes',exact:true}).click();await inside(toolbar(page).locator('.panel'),page);
      await page.keyboard.press('Escape');await expect(toolbar(page).locator('.panel')).toBeHidden();
    }
    await brand(page).click();await page.setViewportSize({width:320,height:600});await expect.poll(async()=>((await brand(page).boundingBox())!.x+60)).toBeLessThanOrEqual(320);
    await inside(toolbar(page).locator('.menu'),page);await page.getByRole('button',{name:'Show notes',exact:true}).click();await inside(toolbar(page).locator('.panel'),page);
  });
  test(`${framework}: compact notes keep their actions and rapid open/close cancels stale animations`,async({page})=>{
    await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Use preview')}}}));
    await page.goto(`http://127.0.0.1:${port}`);await brand(page).click();
    await annotate(page,'#demo-cta','Round the button');await annotate(page,'#hero-title','Make the title smaller');
    await page.getByRole('button',{name:'Show notes',exact:true}).click();
    const rows=toolbar(page).locator('.row');await expect(rows).toHaveCount(2);
    await expect(toolbar(page).locator('.title-count')).toHaveText('2');
    await expect(rows.first().getByRole('button',{name:'Copy',exact:true})).toBeVisible();
    await expect(rows.first().getByRole('button',{name:'Rebind target',exact:true})).toBeHidden();
    await rows.first().locator('summary').focus();await page.keyboard.press('Enter');await expect(rows.first().getByRole('button',{name:'Rebind target',exact:true})).toBeVisible();
    await rows.first().getByRole('button',{name:'Copy',exact:true}).click();const output=await page.getByRole('textbox',{name:'Output for your coding agent'}).inputValue();expect(output).toContain('Round the button');expect(output).not.toContain('Make the title smaller');
    await page.getByRole('button',{name:'Back to notes',exact:true}).click();await rows.last().getByRole('button',{name:'Delete',exact:true}).click();await expect(rows).toHaveCount(1);
    await page.evaluate(()=>{const button=document.querySelector('noktiq-toolbar')!.shadowRoot!.querySelector<HTMLButtonElement>('.brand')!;button.click();button.click();button.click();button.click();});
    await expect(toolbar(page).locator('.menu')).toBeVisible();await page.waitForTimeout(280);
    expect(await toolbar(page).locator('.menu').evaluate(node=>({inert:(node as HTMLElement).inert,closing:node.hasAttribute('data-closing'),opacity:getComputedStyle(node).opacity}))).toEqual({inert:false,closing:false,opacity:'1'});
    await page.getByRole('button',{name:'Show notes',exact:true}).click();await page.getByRole('button',{name:'Clear all',exact:true}).click();await expect(rows).toHaveCount(0);
  });
  test(`${framework}: reduced motion opens and closes surfaces without queued animation`,async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`http://127.0.0.1:${port}`);await brand(page).click();
    expect(await toolbar(page).locator('.menu').evaluate(node=>node.getAnimations({subtree:true}).length)).toBe(0);
    await page.getByRole('button',{name:'Show notes',exact:true}).click();await page.keyboard.press('Escape');
    await expect(toolbar(page).locator('[data-closing]')).toHaveCount(0);await expect(toolbar(page).locator('.panel')).toBeHidden();
  });
}
