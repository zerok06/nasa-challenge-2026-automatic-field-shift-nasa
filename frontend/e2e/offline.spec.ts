import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import {
  agentComposer,
  connectionBadge,
  createSession,
  loadDemoParcel,
  moneyValues,
  openComparison,
  passOnboarding,
  planTabs,
  reportConsoleErrors,
  tabButton,
} from './helpers';

/**
 * Offline PWA: warm the service worker + the comparison cache online, then cut
 * the network and reload real URLs. The app shell and the farmer's last
 * comparison must survive; the agent must degrade honestly.
 */
test.describe.configure({ mode: 'serial' });

let context: BrowserContext;
let page: Page;
let consoleErrors: string[];

test.beforeAll(async ({ browser }) => {
  const session = await createSession(browser);
  context = session.context;
  page = session.page;
  consoleErrors = session.consoleErrors;

  await passOnboarding(page);
  await loadDemoParcel(page);
  await openComparison(page);
  await expect(moneyValues(page).first()).toBeVisible();

  // Second load: the service worker installed on the first load now controls
  // the page and has precached the shell.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, {
    timeout: 45_000,
  });
});

test.afterAll(async () => {
  reportConsoleErrors('offline', consoleErrors);
  await context?.close();
});

test('offline reload of /comparar keeps the shell and the cached comparison', async () => {
  await context.setOffline(true);

  await page.goto('/comparar');

  // App shell: brand header + bottom navigation.
  await expect(page.getByText('ANDEN', { exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toBeVisible();

  // Comparison served from the local cache written before going offline.
  await expect(page.getByRole('heading', { name: 'Tu comparación' })).toBeVisible({
    timeout: 45_000,
  });
  await expect(planTabs(page)).toHaveCount(3);
  await expect(
    page.getByText('Tres caminos para la misma parcela. Revisa el que más te sirva.'),
  ).toBeVisible();
  await expect(
    moneyValues(page).first(),
    'The cached comparison should still show the margin in soles offline',
  ).toBeVisible();
});

test('the agent disables its composer offline and explains why', async () => {
  await page.goto('/preguntar');

  await expect(
    page.getByText(/Sin conexión: el agente necesita internet/),
    'Preguntar must explain that the agent needs a connection',
  ).toBeVisible({ timeout: 45_000 });
  await expect(agentComposer(page)).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Enviar', exact: true })).toBeDisabled();
});

test('offline start on Inicio does not fall back to onboarding', async () => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);

  // The tab bar is only rendered outside onboarding, so it is the clearest
  // signal that the cached profile survived the offline start.
  await expect(tabButton(page, 'Inicio')).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByRole('heading', { name: 'Tu parcela, tus decisiones, más simples' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: /Tu comparación está lista|¿Qué sembrar\?/ }),
    'Offline Inicio should open the dashboard with the cached comparison',
  ).toBeVisible();
});

test('the bottom nav reports "Sin conexión" while offline', async () => {
  // Kept as its own last test: a missing badge (stale bundle) must not hide the
  // offline shell / cache / agent assertions above.
  await expect(
    connectionBadge(page).getByText('Sin conexión', { exact: true }),
    'Bottom nav badge "Sin conexión" not found. If the nav renders without a badge, the deployed bundle is older than src/App.tsx (ConnectionBadge).',
  ).toBeVisible();
});
