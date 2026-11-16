/**
 * Playwright config for the Anden PWA E2E suite.
 *
 * The suite runs against the production-parity stack (Caddy + built PWA +
 * /api proxy) already serving http://localhost:8080. There is intentionally
 * no webServer block: the runner never builds or boots the app, it only drives
 * the deployed artifact, service worker included.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Each spec owns one anonymous farmer (fresh context = new user), so running
  // files in parallel would multiply backend work without any coverage gain.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8080',
    viewport: { width: 430, height: 932 },
    // Spanish copy and Peru dates: the suite asserts the shipped es-PE strings.
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Mobile-first layout: the PWA is designed for a 430x932 phone.
        viewport: { width: 430, height: 932 },
        isMobile: false,
        hasTouch: false,
      },
    },
  ],
});
