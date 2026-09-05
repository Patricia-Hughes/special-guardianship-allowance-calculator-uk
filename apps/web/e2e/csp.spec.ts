/**
 * The site must actually work under its own Content-Security-Policy.
 *
 * This exists because it once did not. The policy said `script-src 'self'`,
 * which blocks the inline scripts Next.js uses to hand each page its data. In
 * production every page rendered for a moment and then went blank. Nothing
 * caught it: the header check verified the policy's text, and the browser tests
 * ran against a file server that never applied it.
 *
 * These tests run against a server that does apply it. A CSP that breaks the
 * site fails the build.
 */
import { expect, test, type Page } from '@playwright/test';

/** Collect anything the browser refuses to run, plus real page errors. */
function watchForViolations(page: Page): { violations: string[]; errors: string[] } {
  const violations: string[] = [];
  const errors: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (/Content Security Policy|violates the following/i.test(text)) violations.push(text);
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return { violations, errors };
}

const PAGES = ['/', '/rates', '/guidance', '/about', '/disclaimer'];

for (const path of PAGES) {
  test(`@csp ${path} loads with no Content-Security-Policy violations`, async ({ page }) => {
    const { violations, errors } = watchForViolations(page);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(violations, `CSP blocked something on ${path}`).toEqual([]);
    expect(errors, `${path} threw`).toEqual([]);
  });
}

test('@csp the security headers are actually served', async ({ request }) => {
  const res = await request.get('/');
  const csp = res.headers()['content-security-policy'];
  expect(csp, 'no CSP served at all — the test server is not applying headers').toBeTruthy();
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("form-action 'none'");
  // connect-src must stay pinned to the hosts we allow [R8]: the postcode
  // lookup, and Google Analytics, which only ever loads after a yes.
  expect(csp).toContain("connect-src 'self' https://api.postcodes.io");
  expect(csp).toContain('https://www.google-analytics.com');
  // The tag itself has to be loadable, or consent buys the reader nothing and
  // the privacy notice describes something that never happens.
  expect(csp).toContain("script-src 'self' 'unsafe-inline' https://www.googletagmanager.com");
  expect(res.headers()['x-frame-options']).toBe('DENY');
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
  expect(res.headers()['referrer-policy']).toBe('no-referrer');
});

test('@csp React hydrates and the calculator is interactive under the CSP', async ({ page }) => {
  // The real symptom of the bug was not an error message — it was a page that
  // rendered and then went blank, because hydration never ran. So assert the
  // thing only a hydrated page can do: respond to a click.
  const { violations } = watchForViolations(page);
  await page.goto('/');

  await page.getByRole('radio', { name: 'England', exact: true }).check();
  await page.getByRole('radio', { name: /South East England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Reaching step 2 at all means client-side state is running.
  await page.getByLabel('How old are they?').first().fill('12');
  await page.getByRole('button', { name: 'Show me the figure' }).click();

  await expect(page.getByText('£255', { exact: false }).first()).toBeVisible();
  expect(violations).toEqual([]);
});

test('@csp the page still has content a second after load', async ({ page }) => {
  // The blank-screen failure mode: content paints from the server HTML, then
  // hydration dies and React unmounts it. A snapshot taken too early passes.
  await page.goto('/');
  await page.waitForTimeout(1000);
  const text = await page.locator('body').innerText();
  expect(text.length).toBeGreaterThan(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
