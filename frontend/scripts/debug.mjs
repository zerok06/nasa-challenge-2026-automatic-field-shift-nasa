import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Saltar' }).click();
await page.waitForTimeout(2000);
console.log('after skip url:', page.url());
console.log('buttons:', await page.getByRole('button').allInnerTexts());
await page.screenshot({ path: 'screenshots/debug-1.png', fullPage: true });
if (await page.getByRole('button', { name: 'Continuar', exact: true }).count()) {
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshots/debug-2.png', fullPage: true });
  console.log('labels:', await page.locator('label').allInnerTexts());
}
await browser.close();
