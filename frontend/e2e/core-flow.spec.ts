import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import {
  createSession,
  loadDemoParcel,
  moneyValues,
  openComparison,
  passOnboarding,
  planTab,
  reportConsoleErrors,
} from './helpers';

/**
 * Core decision flow: demo plot → 3-plan comparison → save a plan → read it back
 * in Mi parcela. The steps share one farmer (one browser context), so the file
 * runs in serial mode.
 */
test.describe.configure({ mode: 'serial' });

const PLAN_NAME = 'Plan QA campaña 2026';

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
});

test.afterAll(async () => {
  reportConsoleErrors('core-flow', consoleErrors);
  await context?.close();
});

test('Comparar calculates the three plans and shows margins in soles', async () => {
  await openComparison(page);

  await expect(page.getByRole('heading', { name: 'Tu comparación' })).toBeVisible();
  await expect(
    page.getByText('Tres caminos para la misma parcela. Revisa el que más te sirva.'),
  ).toBeVisible();

  // A margin in soles must be visible for the selected plan.
  await expect(
    moneyValues(page).first(),
    'No "S/ <amount>" margin found after calculating the comparison',
  ).toBeVisible();
  const margin = (await moneyValues(page).first().innerText()).trim();
  expect(margin).toMatch(/^S\/\s?\d[\d.,]*$/);

  // Switching plans updates the selected tab and the detail below it.
  await planTab(page, /^Alternativa C$/).click();
  await expect(page.getByRole('tab', { name: /^Alternativa C$/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('heading', { name: 'Alternativa C', exact: true })).toBeVisible();

  // Re-select the current plan for the save step.
  await planTab(page, /^Actual$/).click();
  await expect(page.getByRole('heading', { name: 'Tu plan actual' })).toBeVisible();
});

test('saving a plan shows it immediately in Mi parcela', async () => {
  await page.getByRole('button', { name: 'Elegir y guardar mi plan', exact: true }).click();
  await expect(page).toHaveURL(/\/comparar\/guardar$/);
  await expect(
    page.getByRole('heading', { name: '¿Cuál es tu plan principal?' }),
  ).toBeVisible();

  await page.getByLabel(/^Nombre del plan/).fill(PLAN_NAME);
  await page.getByRole('button', { name: 'Confirmar y guardar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Plan guardado' })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'Ver mis planes guardados', exact: true }).click();

  await expect(page).toHaveURL(/\/parcela$/);
  await expect(page.getByRole('heading', { name: 'Mis planes guardados' })).toBeVisible();

  // Product bug (reproducible): the ['saved-plans'] query is cached for 60 s and
  // is never invalidated after the save, so Mi parcela keeps the empty state
  // until a full reload. This assertion is the regression gate for that bug.
  await expect(
    page.getByText(PLAN_NAME, { exact: true }),
    `The plan "${PLAN_NAME}" was saved but Mi parcela still shows "Todavía no guardaste ningún plan" until a reload`,
  ).toBeVisible({ timeout: 10_000 });
});
