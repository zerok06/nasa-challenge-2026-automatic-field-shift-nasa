import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()));
page.on('requestfailed', (r) => console.log('FAILED', r.url(), r.failure()?.errorText));
await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
const info = await page.evaluate(async () => {
  const ready = await navigator.serviceWorker.ready;
  const keys = await caches.keys();
  const cache = keys[0] ? await caches.open(keys[0]) : null;
  const entries = cache ? (await cache.keys()).map((r) => r.url) : [];
  return { scriptURL: ready.active?.scriptURL, state: ready.active?.state, keys, entries };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
