import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E and accessibility — spec §34.
 *
 * Runs against the STATIC EXPORT, not a dev server: what ships is what is
 * tested, including the print stylesheet and the no-JavaScript path.
 */
/**
 * Use the Chromium already present in the image where there is one, rather than
 * downloading a second copy. Falls back to Playwright's own resolution locally.
 */
const bundled = '/opt/pw-browsers/chromium';
const CHROMIUM = existsSync(bundled) ? bundled : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
    // The audience skews older and often uses an older tablet (§32).
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: CHROMIUM } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], launchOptions: { executablePath: CHROMIUM } },
      testIgnore: /print\.spec\.ts/,
    },
  ],
  webServer: {
    // Not a plain file server: this applies the real security headers from
    // public/_headers, so the tests run under the CSP that actually ships. A
    // policy that breaks the site now breaks the build.
    command: 'node e2e/static-server.mjs 4321',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
