import { expect, test } from '@playwright/test';

test('homepage has the requested H1 and a server-rendered Search Console placeholder', async ({
  page,
}) => {
  const response = await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Special guardianship allowance calculator'
  );
  const token = page.locator('head meta[name="google-site-verification"]');
  await expect(token).toHaveCount(1);
  await expect(token).toHaveAttribute('content', 'REPLACE_WITH_YOUR_GOOGLE_SITE_VERIFICATION_CODE');
  const html = await response!.text();
  expect(html.indexOf('google-site-verification')).toBeGreaterThan(-1);
  expect(html.indexOf('google-site-verification')).toBeLessThan(html.indexOf('<body'));
  await expect(page.locator('script#site-google-config')).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => window.SGO_GOOGLE_CONFIG?.ga4MeasurementId))
    .toBe('REPLACE_WITH_YOUR_GA4_MEASUREMENT_ID');
});

test('the editable Google config is served without caching', async ({ page }) => {
  const response = await page.goto('/site-config.js');
  expect(response!.status()).toBe(200);
  expect(response!.headers()['cache-control']).toBe('no-store');
  expect(await response!.text()).toContain('REPLACE_WITH_YOUR_GA4_MEASUREMENT_ID');
});
