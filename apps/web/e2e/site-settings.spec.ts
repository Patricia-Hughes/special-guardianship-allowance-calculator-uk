import { expect, test } from '@playwright/test';

test('homepage preserves the H1 and a server-rendered Search Console verification token', async ({
  page,
}) => {
  const response = await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Special guardianship allowance calculator'
  );
  const token = page.locator('head meta[name="google-site-verification"]');
  await expect(token).toHaveCount(1);
  await expect(token).toHaveAttribute('content', /^[A-Za-z0-9_-]+$/);
  expect(await token.getAttribute('content')).not.toContain('REPLACE_WITH');
  const html = await response!.text();
  expect(html.indexOf('google-site-verification')).toBeGreaterThan(-1);
  expect(html.indexOf('google-site-verification')).toBeLessThan(html.indexOf('<body'));
  await expect(page.locator('script#site-google-config')).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => window.SGO_GOOGLE_CONFIG?.ga4MeasurementId))
    .toBe('G-M4VRDKT4YE');
  await expect(page.locator('head meta[name="google-adsense-account"]')).toHaveAttribute(
    'content', 'ca-pub-4267137695035041'
  );
});

test('the editable Google config is served without caching', async ({ page }) => {
  const response = await page.goto('/site-config.js');
  expect(response!.status()).toBe(200);
  expect(response!.headers()['cache-control']).toBe('no-store');
  expect(await response!.text()).toContain('ga4MeasurementId: "G-M4VRDKT4YE"');
  expect(await response!.text()).toContain('adsenseEnabled: false');
});
