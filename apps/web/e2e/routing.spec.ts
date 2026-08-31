/**
 * Every URL the site links to must actually load.
 *
 * This exists because clicking "Guides" in the menu gave visitors "redirected
 * you too many times". /guidance is both a page and a folder of pages; Apache
 * bounced it to /guidance/ and the trailing-slash rule bounced it back. Nothing
 * caught it, because the tests resolved URLs directly to files and never
 * modelled the redirects.
 *
 * So these follow real redirects, and they walk the whole site rather than the
 * handful of paths someone thought to list.
 */
import { expect, test, type Page } from '@playwright/test';

const PAGES = [
  '/',
  '/rates',
  '/guidance',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/disclaimer',
  '/accessibility',
];

test.describe('every page loads', () => {
  for (const path of PAGES) {
    test(`${path} loads without a redirect loop`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res, `${path} returned nothing`).not.toBeNull();
      expect(res!.status(), `${path} did not return 200`).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }

  test('a section that is also a folder resolves to its page', async ({ page }) => {
    // The exact shape of the bug: guidance.html sits beside a guidance/ folder.
    const res = await page.goto('/guidance');
    expect(res!.status()).toBe(200);
    expect(page.url()).toMatch(/\/guidance$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // And it is the index listing the guides, not one of the guides itself.
    await expect(page.locator('a[href^="/guidance/"]').first()).toBeVisible();
    expect(await page.locator('a[href^="/guidance/"]').count()).toBeGreaterThan(10);
  });

  test('a trailing slash redirects once and settles', async ({ page }) => {
    const res = await page.goto('/guidance/');
    expect(res!.status()).toBe(200);
    expect(page.url(), 'should have landed on the slashless URL').toMatch(/\/guidance$/);
  });

  test('every guide inside the folder loads', async ({ page }) => {
    await page.goto('/guidance');
    const hrefs = await page
      .locator('a[href^="/guidance/"]')
      .evaluateAll((els) => [...new Set(els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!))]);
    expect(hrefs.length, 'no guides linked from the index').toBeGreaterThan(10);

    for (const href of hrefs) {
      const res = await page.goto(href);
      expect(res!.status(), `${href} did not return 200`).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });
});

test('every internal link on every page resolves', async ({ page }) => {
  // A crawl, so a link added later is covered without anyone updating a list.
  const seen = new Set<string>();
  const queue = ['/'];
  const broken: string[] = [];

  while (queue.length > 0 && seen.size < 60) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);

    const res = await page.goto(path);
    if (!res || res.status() !== 200) {
      broken.push(`${path} -> ${res ? res.status() : 'no response'}`);
      continue;
    }
    // Landing somewhere other than where we asked means a redirect chain.
    const landed = new URL(page.url()).pathname;
    if (landed !== path && landed !== `${path}/`) {
      broken.push(`${path} -> redirected to ${landed}`);
    }

    const links = await page
      .locator('a[href^="/"]')
      .evaluateAll((els) =>
        [...new Set(els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!))],
      );
    for (const href of links) {
      const clean = href.split('#')[0]!.split('?')[0]!;
      if (clean && !seen.has(clean) && !clean.startsWith('/_next')) queue.push(clean);
    }
  }

  expect(broken, 'links that did not resolve cleanly').toEqual([]);
  expect(seen.size, 'crawl found almost nothing, which means it is not working').toBeGreaterThan(15);
});

test('a URL that does not exist gives a real 404 page', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res!.status()).toBe(404);
  const body = await page.locator('body').innerText();
  expect(body.length).toBeGreaterThan(100);
});

test('a folder with no page of its own is not browsable', async ({ page }) => {
  // _next has no _next.html, so it must 404 rather than list its contents.
  const res = await page.goto('/_next');
  expect(res!.status()).toBe(404);
});
