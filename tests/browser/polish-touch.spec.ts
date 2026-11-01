import { test, expect } from '@playwright/test';
test.use({hasTouch:true,viewport:{width:390,height:844}});
for(const [framework,port] of [['react',5173],['vue',5174]] as const)test(`${framework}: a real touch drag moves Nok without scrolling or toggling, then tapping still opens it`,async({page,context})=>{
  await page.goto(`http://127.0.0.1:${port}`);const brand=page.locator('noktiq-toolbar .brand');await brand.waitFor();const before=(await brand.boundingBox())!;
  const session=await context.newCDPSession(page);const x=before.x+before.width/2,y=before.y+before.height/2;
  const scroll=await page.evaluate(()=>scrollY);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=12;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-120*i/12,y:y-170*i/12}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const after=(await brand.boundingBox())!;expect(after.x).toBeLessThan(before.x-90);expect(after.y).toBeLessThan(before.y-140);expect(await page.evaluate(()=>scrollY)).toBe(scroll);
  await expect(brand).toHaveAttribute('aria-expanded','false');await page.touchscreen.tap(after.x+30,after.y+30);await expect(brand).toHaveAttribute('aria-expanded','true');
  await page.touchscreen.tap(after.x+30,after.y+30);await expect(brand).toHaveAttribute('aria-expanded','false');
  await brand.focus();await page.keyboard.press('Space');await expect(brand).toHaveAttribute('aria-expanded','true');await session.detach();
});
