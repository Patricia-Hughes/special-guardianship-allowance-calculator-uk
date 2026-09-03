import { existsSync, readdirSync } from 'node:fs';
import { defineConfig, devices, type Project } from '@playwright/test';

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

/**
 * Safari, where it can be installed.
 *
 * The audience skews 55 to 75 and a large share of them read this on an iPad,
 * which is WebKit. Testing only Chromium hid a real defect: the letter download
 * revoked its object URL on the next line, which Safari and older Firefox treat
 * as a cancelled download, so "Download as a file" did nothing and no test
 * noticed.
 *
 * Some sandboxes cannot reach Playwright's browser CDN. Rather than declare a
 * project that fails to launch, or worse one that silently never runs, the
 * project is added only when the browser is actually present and a line is
 * printed when it is not. CI installs it, so CI always runs it.
 */
const browsersDir = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
const hasWebkit = (() => {
  try {
    return readdirSync(browsersDir).some((d) => d.startsWith('webkit'));
  } catch {
    return false;
  }
})();
if (!hasWebkit && !process.env.CI) {
  console.warn('playwright: webkit is not installed, so the Safari project is skipped.');
}

const webkitProject: Project[] = hasWebkit
  ? [{ name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: /print\.spec\.ts/ }]
  : [];

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
    ...webkitProject,
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
