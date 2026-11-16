import { expect, test } from '@playwright/test';
import {
  collectVisibleButtons,
  connectionBadge,
  loadDemoParcel,
  passOnboarding,
  reportConsoleErrors,
  tabButton,
  watchConsole,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test('after onboarding the four tabs work, the badge reports online and Inicio has named buttons', async ({
  page,
}) => {
  const consoleErrors = watchConsole(page);

  await passOnboarding(page);
  await loadDemoParcel(page);

  // Inicio
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: '¿Qué sembrar?' })).toBeVisible();

  // Comparar (no comparison yet: the hero invites to create one)
  await tabButton(page, 'Comparar').click();
  await expect(page).toHaveURL(/\/comparar$/);
  await expect(
    page.getByRole('heading', { name: 'Compara 3 planes para tu parcela' }),
  ).toBeVisible();

  // Preguntar (empty conversation with the three suggestions)
  await tabButton(page, 'Preguntar').click();
  await expect(page).toHaveURL(/\/preguntar$/);
  await expect(page.getByRole('heading', { name: '¿Qué quieres saber?' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: '¿Qué siembro con menos agua?', exact: true }),
  ).toBeVisible();

  // Mi parcela (demo parcel with the DEMO badge)
  await tabButton(page, 'Mi parcela').click();
  await expect(page).toHaveURL(/\/parcela$/);
  await expect(page.getByRole('heading', { name: 'Parcela demo', exact: true })).toBeVisible();

  // Back to Inicio
  await tabButton(page, 'Inicio').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: '¿Qué sembrar?' })).toBeVisible();

  // Every visible button on Inicio must have an accessible name.
  const buttons = await collectVisibleButtons(page);
  expect(buttons.length, 'Inicio should render several buttons').toBeGreaterThan(4);
  const unnamed = buttons.filter((button) => !button.name);
  expect(
    unnamed,
    `Buttons without accessible name on Inicio:\n${unnamed
      .map((button) => `- ${button.html}`)
      .join('\n')}`,
  ).toEqual([]);

  // The connection badge lives in the bottom nav and must report the real state.
  // Asserted last so a missing badge (stale bundle) does not hide the tab
  // coverage above.
  await expect(
    connectionBadge(page).getByText('En línea', { exact: true }),
    'Bottom nav badge "En línea" not found. If the nav renders without a badge, the deployed bundle is older than src/App.tsx (ConnectionBadge).',
  ).toBeVisible();

  reportConsoleErrors('navigation', consoleErrors);
});
