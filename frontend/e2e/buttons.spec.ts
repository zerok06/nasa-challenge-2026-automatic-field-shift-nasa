import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import {
  collectVisibleButtons,
  createSession,
  loadDemoParcel,
  openComparison,
  passOnboarding,
  reportConsoleErrors,
  tabButton,
} from './helpers';

/**
 * Button audit: every visible button on the five main screens must expose an
 * accessible name, and every navigation control must actually move the farmer
 * (URL or visible heading changes).
 */
test.describe.configure({ mode: 'serial' });

type ScreenLabel = 'Inicio' | 'Mi parcela' | 'Comparar' | 'Preguntar' | 'Ajustes';

const SCREENS: { label: ScreenLabel; path: string }[] = [
  { label: 'Inicio', path: '/' },
  { label: 'Mi parcela', path: '/parcela' },
  { label: 'Comparar', path: '/comparar' },
  { label: 'Preguntar', path: '/preguntar' },
  { label: 'Ajustes', path: '/ajustes' },
];

/** Destructive controls are never clicked by the audit. */
const DESTRUCTIVE = /Eliminar|Quitar|Descartar/i;

/**
 * Controls that do something in place instead of navigating: chat sends,
 * simulator actions, inline editors. They are excluded from the navigation
 * assertion (their behaviour is covered by their own specs).
 */
const IN_PLACE = [
  /^Enviar$/,
  /^Hacerlo$/,
  /^Calcular el cambio$/,
  /^Restablecer$/,
  /^Actualizar datos$/,
  /^Guardar cambios$/,
  /^Confirmar y guardar$/,
  /^Reintentar/,
  /^Actualizar datos guardados$/,
  /^Preparar datos para sin señal$/,
  /^Compartir /, // Ajustes: opens the share sheet / copies the link
  /^Instalar Anden$/,
  /^¿Qué siembro con menos agua\?$/,
  /^¿Qué pasa si baja el precio\?$/,
  /^Guarda un plan$/,
  /^¿Cuánta agua me falta\?$/,
  /^¿Qué puedes hacer\?$/,
  /^Sí, me ayudó$/,
  /^No me ayudó$/,
  /^No entendí$/,
  /^Me sirvió$/,
  /^No me sirvió$/,
  /^Guardar esta estimación$/,
  /^No sé cuánta agua uso/,
  /^Guardar datos del análisis$/,
  /^No tengo análisis$/,
  /^Guardar prioridades$/,
  /^Agregar al historial$/,
  /^(Actual|Alternativa B|Alternativa C|Ejemplo)$/, // Comparar tabs: change selection in place
];

/** Screen-specific in-place controls (labels that are navigation elsewhere). */
const IN_PLACE_BY_SCREEN: Record<string, RegExp[]> = {
  '/parcela': [/^Editar$/, /^Cancelar$/, /^Usar mi ubicación$/],
  // The Comparar footer button only scrolls to the simulator.
  '/comparar': [/^Probar un cambio$/],
};

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
  reportConsoleErrors('buttons', consoleErrors);
  await context?.close();
});

async function openScreen(label: ScreenLabel): Promise<void> {
  if (label === 'Comparar') {
    // Keeps (or creates) a loaded comparison so the footer buttons exist.
    await openComparison(page);
  } else if (label === 'Ajustes') {
    await page.goto('/ajustes');
  } else {
    await tabButton(page, label).click();
  }
  await expect(page.locator('#main')).toBeVisible();
  await page.waitForTimeout(400);
}

async function signature(): Promise<string> {
  const path = new URL(page.url()).pathname;
  const heading = await page
    .locator('h1:visible, h2:visible')
    .first()
    .innerText()
    .catch(() => '');
  return `${path}::${heading.trim()}`;
}

async function restore(path: string): Promise<void> {
  await page.goBack({ waitUntil: 'commit' }).catch(() => undefined);
  await page.waitForTimeout(350);
  if (new URL(page.url()).pathname !== path) {
    await page.goto(path);
    await page.waitForTimeout(600);
  }
  await expect(page.locator('#main')).toBeVisible();
}

test('every visible button on the five screens has an accessible name', async () => {
  const problems: string[] = [];
  const counts: string[] = [];

  for (const screen of SCREENS) {
    await openScreen(screen.label);
    const buttons = await collectVisibleButtons(page);
    counts.push(`${screen.label}: ${buttons.length} controls`);
    expect(
      buttons.length,
      `${screen.label} rendered no buttons at all — the screen did not load`,
    ).toBeGreaterThan(0);

    for (const button of buttons) {
      if (!button.name) {
        problems.push(`${screen.label} (${screen.path}): unnamed control → ${button.html}`);
      }
    }
  }

  console.log(`[buttons] audited ${counts.join(' · ')}`);
  expect(
    problems,
    `Buttons without accessible name (innerText or aria-label):\n${problems.join('\n')}`,
  ).toEqual([]);
});

test('every navigation button moves the farmer to another URL or heading', async () => {
  const failures: string[] = [];
  const clicked: string[] = [];

  for (const screen of SCREENS) {
    await openScreen(screen.label);
    const buttons = await collectVisibleButtons(page);

    const names = Array.from(new Set(buttons.map((button) => button.name))).filter(Boolean);

    for (const name of names) {
      if (DESTRUCTIVE.test(name)) continue;
      if (IN_PLACE.some((pattern) => pattern.test(name))) continue;
      if ((IN_PLACE_BY_SCREEN[screen.path] ?? []).some((pattern) => pattern.test(name))) continue;

      const target = page.getByRole('button', { name, exact: true }).first();
      if (!(await target.isVisible().catch(() => false))) continue;

      // The active tab does not navigate anywhere by design.
      if ((await target.getAttribute('aria-current')) === 'page') continue;

      const before = await signature();
      try {
        await target.click({ timeout: 10_000 });
        await expect
          .poll(signature, {
            timeout: 8_000,
            message: `"${name}" on ${screen.label} did not change the URL or the visible heading`,
          })
          .not.toBe(before);
        clicked.push(`${screen.label}: ${name}`);
      } catch (cause) {
        failures.push(
          `${screen.label} (${screen.path}) · "${name}": ${
            cause instanceof Error ? cause.message.split('\n')[0] : String(cause)
          }`,
        );
      } finally {
        await restore(screen.path);
      }
    }
  }

  console.log(`[buttons] ${clicked.length} navigation controls clicked:\n${clicked.join('\n')}`);
  expect(failures, `Navigation buttons that did nothing:\n${failures.join('\n')}`).toEqual([]);
});
