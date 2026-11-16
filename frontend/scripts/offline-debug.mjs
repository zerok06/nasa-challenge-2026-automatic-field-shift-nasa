import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
const page = await context.newPage();
page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()));
await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
console.log('sw controller:', await page.evaluate(() => Boolean(navigator.serviceWorker.controller)));
console.log(
  'registrations:',
  await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistrations()).map((r) => ({
      scope: r.scope,
      active: r.active?.state,
    })),
  ),
);
console.log('caches:', await page.evaluate(() => caches.keys()));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
console.log('after reload controller:', await page.evaluate(() => Boolean(navigator.serviceWorker.controller)));
await context.setOffline(true);
const resp = await page.goto('http://localhost:8080/comparar', { waitUntil: 'domcontentloaded' }).catch((e) => String(e));
console.log('offline nav:', typeof resp === 'string' ? resp : resp?.status());
await page.screenshot({ path: 'screenshots/debug-offline.png', fullPage: true });
await browser.close();
