/**
 * Consent has to come before the cookie, not after it.
 *
 * The privacy notice tells a carer that nothing counts their visit until they
 * say yes. That sentence is only true while the code keeps its side of it, and
 * the failure mode is silent: a tag loaded one line too early looks identical
 * on screen and breaks the promise completely.
 *
 * The configured tests supply a fake ID through the editable config file and
 * intercept every Google request. Placeholder behavior is tested separately.
 */
import { expect, test, type Page } from '@playwright/test';

const GOOGLE = /googletagmanager\.com|google-analytics\.com/;

/** Record every attempt to reach Google, and stop it going anywhere real. */
async function watchGoogle(page: Page): Promise<string[]> {
  const hits: string[] = [];
  await page.route(GOOGLE, (route) => {
    hits.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '',
    });
  });
  return hits;
}

const banner = (page: Page) => page.getByRole('region', { name: 'Cookies on this site' });

const TEST_ID = 'G-TEST123456';

test.describe('configured analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/site-config.js', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `window.SGO_GOOGLE_CONFIG = { ga4MeasurementId: "${TEST_ID}" };`,
      })
    );
  });

  test('@consent nothing reaches Google before an answer is given', async ({ page }) => {
    const hits = await watchGoogle(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(hits, 'a tag loaded before the reader was asked').toEqual([]);

    await expect(banner(page).getByRole('button', { name: 'Yes, that is fine' })).toBeVisible();
    await expect(banner(page).getByRole('button', { name: 'No thank you' })).toBeVisible();
  });

  test('@consent saying no keeps it that way, including after a reload', async ({ page }) => {
    const hits = await watchGoogle(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(banner(page)).toBeVisible();

    await banner(page).getByRole('button', { name: 'No thank you' }).click();
    await expect(banner(page)).toBeHidden();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(banner(page), 'the question came back after it was answered').toBeHidden();
    expect(hits, 'a tag loaded despite the reader saying no').toEqual([]);
  });

  test('@consent saying yes loads the tag, and only then', async ({ page }) => {
    const hits = await watchGoogle(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(banner(page)).toBeVisible();

    expect(hits).toEqual([]);
    await banner(page).getByRole('button', { name: 'Yes, that is fine' }).click();
    await expect(banner(page)).toBeHidden();

    await expect
      .poll(() => hits.length, {
        message: 'consent was given but no tag was requested',
      })
      .toBeGreaterThan(0);
    expect(hits[0]).toContain('googletagmanager.com/gtag/js');
  });

  test('@consent the answer can be changed on the privacy page', async ({ page }) => {
    await watchGoogle(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(banner(page)).toBeVisible();

    await banner(page).getByRole('button', { name: 'No thank you' }).click();
    await page.goto('/privacy');
    await expect(page.getByText('You have said no to analytics cookies')).toBeVisible();

    await page.getByRole('button', { name: 'Turn analytics on' }).click();
    await expect(page.getByText('You have said yes to analytics cookies')).toBeVisible();
  });

  test('@consent turning analytics off and on clears opt-out without a duplicate tag', async ({
    page,
  }) => {
    const hits = await watchGoogle(page);
    await page.goto('/privacy');
    await expect(banner(page)).toBeVisible();
    await page.getByRole('button', { name: 'Turn analytics on' }).click();
    await expect(banner(page)).toBeHidden();
    await expect.poll(() => hits.length).toBe(1);
    await page.getByRole('button', { name: 'Turn analytics off' }).click();
    expect(
      await page.evaluate(
        (id) => (window as unknown as Record<string, unknown>)[`ga-disable-${id}`],
        TEST_ID
      )
    ).toBe(true);
    await page.getByRole('button', { name: 'Turn analytics on' }).click();
    expect(
      await page.evaluate(
        (id) => (window as unknown as Record<string, unknown>)[`ga-disable-${id}`],
        TEST_ID
      )
    ).toBe(false);
    await expect(page.locator('#ga-tag')).toHaveCount(1);
    expect(hits).toHaveLength(1);
  });

  test('@consent page view commands exclude shared query strings and fragments', async ({
    page,
  }) => {
    await watchGoogle(page);
    await page.goto('/?private=child-age-12#income-2000');
    await banner(page).getByRole('button', { name: 'Yes, that is fine' }).click();
    const commands = await page.evaluate(() =>
      (window.dataLayer ?? []).map((value) => Array.from(value as ArrayLike<unknown>))
    );
    expect(commands.find((command) => command[0] === 'config')).toEqual([
      'config',
      TEST_ID,
      expect.objectContaining({
        send_page_view: false,
        page_location: new URL(page.url()).origin + '/',
      }),
    ]);
    expect(commands.filter((command) => command[1] === 'page_view')).toHaveLength(1);
    expect(JSON.stringify(commands)).not.toMatch(/child-age|income-2000/);
  });
});

test('@consent an unreplaced placeholder loads no Google tag and shows analytics as off', async ({
  page,
}) => {
  await page.route('**/site-config.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.SGO_GOOGLE_CONFIG = { ga4MeasurementId: "REPLACE_WITH_YOUR_GA4_MEASUREMENT_ID" };',
  }));
  const hits = await watchGoogle(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(banner(page)).toHaveCount(0);
  await expect(page.locator('#ga-tag')).toHaveCount(0);
  await page.goto('/privacy');
  await expect(page.getByText('Analytics are currently off on this site.')).toBeVisible();
  expect(hits).toEqual([]);
});
