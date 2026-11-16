/**
 * Shared helpers for the Anden PWA E2E suite.
 *
 * The suite runs against the production-parity build on :8080 (Caddy + service
 * worker + /api proxy). Every helper here is copy-based on the shipped Spanish
 * strings, so a copy change in the app is a visible test failure, not a silent
 * skip.
 */
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

export const APP_URL = 'http://localhost:8080';
export const VIEWPORT = { width: 430, height: 932 };
export const LOCALE = 'es-PE';

export type TabName = 'Inicio' | 'Comparar' | 'Preguntar' | 'Mi parcela';

/** A fresh context is a new anonymous farmer: no profile, no intro flag. */
export async function createSession(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page; consoleErrors: string[] }> {
  const context = await browser.newContext({
    baseURL: APP_URL,
    viewport: VIEWPORT,
    locale: LOCALE,
    timezoneId: 'America/Lima',
  });
  const page = await context.newPage();
  const consoleErrors = watchConsole(page);
  return { context, page, consoleErrors };
}

/**
 * Collect console errors and uncaught page errors. Specs print the list at the
 * end (reportConsoleErrors) so the QA report can quote real messages.
 */
export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

/** Walk the three intro slides (Continuar, Continuar, Comenzar). */
export async function completeIntro(page: Page): Promise<void> {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Tu parcela, tus decisiones', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Compara opciones con calma', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Prueba antes de decidir', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Comenzar', exact: true }).click();
}

/**
 * Complete the five onboarding steps with the pilot defaults:
 * language (Español) → name → "Ahora no" for location → consent → profile.
 *
 * NOTE (product bug): the step-5 confirmation ("Tu perfil está listo" with
 * "Ir a Inicio") is unreachable. Saving the profile flips
 * `onboarding_completed_at`, and the /onboarding route immediately redirects to
 * Inicio, so the success screen never renders. The helper accepts both paths so
 * the rest of the suite is not blocked by that bug.
 */
export async function completeOnboarding(page: Page, name = 'Juan'): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Tu parcela, tus decisiones, más simples' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { name: '¿Cómo te llamas?' })).toBeVisible();
  await page.getByLabel(/^Nombre\b/).fill(name);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { name: '¿Dónde está tu parcela?' })).toBeVisible();
  await page.getByRole('button', { name: 'Ahora no', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Revisa y acepta' })).toBeVisible();
  await page.getByLabel('Aceptar el uso de datos del piloto').check();
  await page.getByRole('button', { name: 'Crear mi perfil', exact: true }).click();

  const home = page.getByRole('heading', { name: 'Bienvenido a Anden' });
  const success = page.getByRole('heading', { name: 'Tu perfil está listo' });
  await expect(home.or(success).first()).toBeVisible({ timeout: 30_000 });
  if (await success.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Ir a Inicio', exact: true }).click();
  }
  await expect(home).toBeVisible();
}

/** Intro + onboarding, ending on the empty Inicio. */
export async function passOnboarding(page: Page, name = 'Juan'): Promise<void> {
  await completeIntro(page);
  await completeOnboarding(page, name);
}

/** Create the DEMO plot from the empty Inicio and wait for the populated home. */
export async function loadDemoParcel(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Probar con datos de ejemplo', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¿Qué sembrar?' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText('DEMO', { exact: true }).first()).toBeVisible();
}

/** Bottom tab bar button (the nav is the only <nav> with that accessible name). */
export function tabButton(page: Page, name: TabName) {
  return page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('button', { name, exact: true });
}

/** Connection badge that lives in the bottom nav. */
export function connectionBadge(page: Page) {
  return page.getByRole('navigation', { name: 'Navegación principal' });
}

/**
 * Plan selector in Comparar: three tabs (Actual / Alternativa B / C) with only
 * the selected plan's detail below.
 */
export function planTabs(page: Page) {
  return page.getByRole('tablist', { name: 'Planes para tu parcela' }).getByRole('tab');
}

export function planTab(page: Page, label: RegExp | string) {
  return page
    .getByRole('tablist', { name: 'Planes para tu parcela' })
    .getByRole('tab', { name: label });
}

/** Assert the comparison finished and offers the current plan plus B and C. */
export async function expectComparisonPlans(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Tu comparación' })).toBeVisible({
    timeout: 90_000,
  });
  await expect(planTabs(page)).toHaveCount(3);
  await expect(planTab(page, /^Alternativa B$/)).toBeVisible();
  await expect(planTab(page, /^Alternativa C$/)).toBeVisible();
  await expect(page.getByRole('tab', { selected: true })).toHaveCount(1);
}

/** Money is always rendered as "S/ 16,480.00". */
export function moneyValues(page: Page) {
  return page.getByText(/S\/\s?\d[\d.,]*/);
}

export type VisibleButton = { name: string; html: string };

/**
 * Every rendered button / [role=button] with its accessible name.
 * Name follows the QA rule: aria-label first, then visible text.
 */
export async function collectVisibleButtons(page: Page): Promise<VisibleButton[]> {
  return page.evaluate(() => {
    const isVisible = (element: Element): boolean => {
      // Content inside a closed <details> is still laid out by Chromium, so
      // innerText is empty and getBoundingClientRect is non-zero. Exclude it:
      // it is not visible to the farmer until the disclosure is opened.
      if (element.closest('details:not([open])')) return false;
      if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element as HTMLElement);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    };

    return Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter(isVisible)
      .map((element) => {
        const ariaLabel = (element.getAttribute('aria-label') ?? '').trim();
        const text = ((element as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim();
        return {
          name: ariaLabel || text,
          html: element.outerHTML.slice(0, 180),
        };
      });
  });
}

/** Go to Comparar and make sure a comparison exists (creates it if needed). */
export async function openComparison(page: Page): Promise<void> {
  await tabButton(page, 'Comparar').click();
  await expect(page).toHaveURL(/\/comparar$/);

  const create = page.getByRole('button', { name: 'Comparar ahora', exact: true });
  // Wait until the screen has painted before deciding whether a comparison exists.
  await expect(create.or(planTabs(page).first()).first()).toBeVisible({ timeout: 30_000 });
  if (await create.isVisible().catch(() => false)) {
    await create.click();
  }
  await expectComparisonPlans(page);
}

/**
 * Agent bubbles. The user bubble is right-aligned (`rounded-br-sm`), the agent
 * answer is left-aligned (`rounded-bl-sm`). Class-based selectors keep the
 * chat assertions independent from the quick-reply chips, which repeat the
 * question text as buttons.
 */
export function agentAnswers(page: Page) {
  return page.locator('p.rounded-bl-sm');
}

export function agentUserBubbles(page: Page) {
  return page.locator('p.rounded-br-sm');
}

export function agentComposer(page: Page) {
  return page.getByLabel('Escribe tu pregunta');
}

/** Print collected console errors to the line reporter (visible in QA runs). */
export function reportConsoleErrors(label: string, errors: string[]): void {
  if (errors.length === 0) return;
  console.warn(`\n[console errors · ${label}]\n${errors.join('\n')}`);
}
