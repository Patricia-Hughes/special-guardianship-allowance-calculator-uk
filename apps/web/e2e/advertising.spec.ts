import { expect, test, type Page } from '@playwright/test';

const AD_NETWORK = /fundingchoicesmessages\.google\.com|googlesyndication\.com|doubleclick\.net/;
const guide = '/guidance/how-the-means-test-works';

async function configure(page: Page, enabled = true): Promise<string[]> {
  const hits: string[] = [];
  await page.route('**/site-config.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.SGO_GOOGLE_CONFIG = { ga4MeasurementId: '', adsenseEnabled: ${enabled} };`,
  }));
  await page.route(AD_NETWORK, (route) => {
    hits.push(route.request().url());
    const cmp = route.request().url().includes('fundingchoicesmessages');
    return route.fulfill({
      contentType: 'application/javascript',
      body: cmp ? `
        window.googlefc = window.googlefc || {};
        window.googlefc.showRevocationMessage = function() {
          window.__testConsent(false);
        };
        window.__testConsent = function(granted, success = true, complete = true) {
          localStorage.setItem('test-ad-consent', String(granted));
          window.__testCallback?.({
            eventStatus: complete ? 'useractioncomplete' : 'cmpuishown',
            cmpStatus: 'loaded', gdprApplies: true, tcString: 'TEST_TCF_STRING', listenerId: 1,
            purpose: { consents: { 1: granted } }, vendor: { consents: { 755: granted } }
          }, success);
        };
        window.__tcfapi = function(command, version, callback) {
          if (command === 'removeEventListener') return;
          window.__testCallback = callback;
          window.__testConsent(localStorage.getItem('test-ad-consent') === 'true');
        };
      ` : '',
    });
  });
  return hits;
}

async function consent(page: Page, granted: boolean, success = true, complete = true) {
  await page.evaluate(([g, s, c]) => {
    const fn = (window as unknown as { __testConsent: (g: boolean, s: boolean, c: boolean) => void }).__testConsent;
    fn(g!, s!, c!);
  }, [granted, success, complete]);
}

test('disabled advertising makes no ad or CMP request', async ({ page }) => {
  const hits = await configure(page, false);
  await page.goto(guide);
  await page.waitForLoadState('networkidle');
  expect(hits).toEqual([]);
  await page.goto('/privacy');
  await expect(page.getByText('Advertising is currently off on this site.')).toBeVisible();
  expect(hits).toEqual([]);
});

for (const path of ['/', '/?children=12#income-2000', `${guide}?private=child`, `${guide}#private`, '/contact']) {
  test(`enabled advertising excludes ${path}`, async ({ page }) => {
    const hits = await configure(page);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(hits).toEqual([]);
    await expect(page.locator('#sgo-certified-cmp, #sgo-adsense')).toHaveCount(0);
  });
}

test('only completed positive CMP consent loads one ad tag', async ({ page }) => {
  const hits = await configure(page);
  await page.goto(guide);
  await expect.poll(() => hits.length).toBe(1);
  await page.waitForFunction(() => '__testCallback' in window);
  await expect(page.locator('#sgo-adsense')).toHaveCount(0);
  await consent(page, true, false);
  await consent(page, true, true, false);
  await page.evaluate(() => {
    const callback = (window as unknown as {
      __testCallback: (data: Record<string, unknown>, success: boolean) => void;
    }).__testCallback;
    for (const overrides of [
      { tcString: '' },
      { gdprApplies: undefined },
      { vendor: { consents: { 755: false } } },
      { purpose: { consents: { 1: false } } },
      { publisher: { restrictions: { 1: { 755: 0 } } } },
    ]) {
      callback({
        eventStatus: 'useractioncomplete', cmpStatus: 'loaded', gdprApplies: true,
        tcString: 'TEST_TCF_STRING', purpose: { consents: { 1: true } },
        vendor: { consents: { 755: true } }, ...overrides,
      }, true);
    }
  });
  await expect(page.locator('#sgo-adsense')).toHaveCount(0);
  await consent(page, true);
  await expect.poll(() => hits.filter((url) => url.includes('adsbygoogle.js')).length).toBe(1);
  await consent(page, true);
  await expect(page.locator('head #sgo-adsense')).toHaveCount(1);
  expect(hits.filter((url) => url.includes('adsbygoogle.js'))).toHaveLength(1);
});

test('withdrawal reloads the document and keeps ad code out', async ({ page }) => {
  const hits = await configure(page);
  await page.goto(guide);
  await page.waitForFunction(() => '__testCallback' in window);
  await consent(page, true);
  await expect.poll(() => hits.filter((url) => url.includes('adsbygoogle.js')).length).toBe(1);
  const reloaded = page.waitForEvent('domcontentloaded');
  await consent(page, false);
  await reloaded;
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#sgo-adsense')).toHaveCount(0);
  expect(hits.filter((url) => url.includes('adsbygoogle.js'))).toHaveLength(1);
});

test('privacy controls open the CMP without showing ads or granting Analytics consent', async ({ page }) => {
  const hits = await configure(page);
  await page.addInitScript(() => localStorage.setItem('test-ad-consent', 'true'));
  await page.goto('/privacy');
  await page.getByRole('button', { name: 'Change advertising choices' }).click();
  expect(await page.evaluate(() => localStorage.getItem('test-ad-consent'))).toBe('false');
  expect(await page.evaluate(() => localStorage.getItem('sgo-analytics-consent'))).toBeNull();
  await expect(page.locator('#sgo-adsense')).toHaveCount(0);
  expect(hits.every((url) => url.includes('fundingchoicesmessages'))).toBe(true);
});

test('a missing CMP response never enables ads', async ({ page }) => {
  const hits = await configure(page);
  await page.route('**/fundingchoicesmessages.google.com/**', (route) => route.abort());
  await page.goto('/privacy');
  await expect(page.getByText('Advertising privacy choices are unavailable. No ads are loaded on this page.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change advertising choices' })).toHaveCount(0);
  expect(hits.filter((url) => url.includes('adsbygoogle.js'))).toEqual([]);
});
