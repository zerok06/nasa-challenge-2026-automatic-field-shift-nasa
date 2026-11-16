/**
 * Visual + offline smoke test.
 * Requires `docker compose up -d` (frontend on :5173, API on :8000).
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/01-intro.png` });

await page.getByRole('button', { name: 'Continuar' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'Continuar' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'Comenzar' }).click();
await page.waitForTimeout(1500);

if ((await page.getByText('PASO 1 DE 5').count()) > 0) {
  await page.screenshot({ path: `${OUT}/02-onboarding.png` });
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByLabel(/Nombre/).fill('Juan');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Ahora no' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('checkbox', { name: 'Aceptar el uso de datos del piloto' }).check();
  await page.getByRole('button', { name: 'Crear mi perfil' }).click();
  await page.waitForTimeout(2000);
}

await page.screenshot({ path: `${OUT}/03-home-empty.png`, fullPage: true });

const demo = page.getByRole('button', { name: 'Probar con datos de ejemplo' });
if ((await demo.count()) > 0) {
  await demo.click();
  await page.waitForTimeout(3000);
}
await page.screenshot({ path: `${OUT}/04-home.png`, fullPage: true });

// Generar una comparación real para ver el detalle de planes.
await page.goto('http://localhost:8080/comparar', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/05-comparar-vacio.png`, fullPage: true });
const compareButton = page.getByRole('button', { name: 'Comparar ahora' });
if ((await compareButton.count()) > 0) {
  await compareButton.click();
  await page.waitForTimeout(6000);
}
await page.screenshot({ path: `${OUT}/06-comparar-planes.png`, fullPage: true });

// Agente: una pregunta real (requiere red).
await page.goto('http://localhost:8080/preguntar', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const suggestion = page.getByRole('button', { name: /¿Qué siembro con menos agua?/ });
if ((await suggestion.count()) > 0) {
  await suggestion.click();
  await page.waitForTimeout(6000);
}
await page.screenshot({ path: `${OUT}/07-agente.png`, fullPage: true });

for (const [name, path] of [
  ['08-parcela', '/parcela'],
  ['09-ficha', '/parcela/ficha'],
  ['10-economia', '/parcela/economia'],
  ['11-riego', '/parcela/riego'],
  ['12-ajustes', '/ajustes'],
  ['13-fuentes', '/fuentes'],
]) {
  await page.goto(`http://localhost:8080${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

// ── Offline: recarga con la red apagada ────────────────────────────────
await context.setOffline(true);
await page.goto('http://localhost:8080/comparar', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/14-offline-comparar.png`, fullPage: true });
await page.goto('http://localhost:8080/preguntar', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/15-offline-agente.png`, fullPage: true });

console.log('URL:', page.url());
console.log('ERRORS:', errors.length ? [...new Set(errors)].slice(0, 8).join('\n') : 'none');
await browser.close();
