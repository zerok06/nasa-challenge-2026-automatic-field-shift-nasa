import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import {
  agentAnswers,
  agentComposer,
  agentUserBubbles,
  createSession,
  loadDemoParcel,
  passOnboarding,
  reportConsoleErrors,
  tabButton,
} from './helpers';

/**
 * Preguntar: the suggestion cards and the composer must produce real answers
 * from the deterministic agent. Both tests share one conversation thread.
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

  // The agent needs a thread before it accepts messages: the suggestion cards do
  // nothing until POST /agent/threads resolves.
  const threadResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/agent/threads') &&
      response.request().method() === 'POST',
    { timeout: 45_000 },
  );
  await tabButton(page, 'Preguntar').click();
  const response = await threadResponse;
  expect(response.ok(), `POST /api/v1/agent/threads failed with ${response.status()}`).toBeTruthy();
  await expect(page.getByRole('heading', { name: '¿Qué quieres saber?' })).toBeVisible();
});

test.afterAll(async () => {
  reportConsoleErrors('agent', consoleErrors);
  await context?.close();
});

test('the suggestion "¿Qué siembro con menos agua?" returns an answer with a next step', async () => {
  await page
    .getByRole('button', { name: '¿Qué siembro con menos agua?', exact: true })
    .click();

  // The farmer's prompt is shown as a right-aligned bubble straight away.
  await expect(
    agentUserBubbles(page).filter({ hasText: 'Compara rotaciones que usen menos agua' }),
  ).toBeVisible();

  // The answer bubble is left-aligned (rounded-bl-sm) and only appears when the
  // API responds.
  const answer = agentAnswers(page).first();
  await expect(
    answer,
    'The agent did not render an answer bubble for the water suggestion',
  ).toBeVisible({ timeout: 60_000 });

  const answerText = (await answer.innerText()).trim();
  expect(answerText.length, `Answer bubble is empty: "${answerText}"`).toBeGreaterThan(20);

  // Every answer closes with a proposal: a "Siguiente paso" card and/or a
  // one-tap proposal button.
  await expect(
    page
      .getByRole('heading', { name: 'Siguiente paso' })
      .or(page.getByRole('button', { name: 'Hacerlo', exact: true }))
      .first(),
    'The answer should include a "Siguiente paso" / proposal card',
  ).toBeVisible();
});

test('the composer sends a typed question and renders a second answer', async () => {
  const composer = agentComposer(page);
  await expect(composer).toBeEnabled();

  await composer.fill('¿Cuánta agua me falta?');
  await expect(page.getByRole('button', { name: 'Enviar', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();

  await expect(
    agentUserBubbles(page).filter({ hasText: '¿Cuánta agua me falta?' }),
    'The typed question should appear as a chat bubble',
  ).toBeVisible();

  // First answer + second answer (the green "note" bubbles share the class, so
  // assert at least two).
  await expect
    .poll(async () => agentAnswers(page).count(), {
      timeout: 60_000,
      message: 'The agent never answered the typed question',
    })
    .toBeGreaterThanOrEqual(2);

  const lastAnswer = agentAnswers(page).last();
  await expect(lastAnswer).toBeVisible();
  expect((await lastAnswer.innerText()).trim().length).toBeGreaterThan(10);

  // The composer is cleared and ready for the next question.
  await expect(composer).toHaveValue('');
});
