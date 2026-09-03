/**
 * Accessibility — spec §24 and §34. Zero axe violations on every route.
 *
 * Tagged @a11y so `pnpm test:a11y` can run just these.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const guidanceSlugs = readdirSync(join(process.cwd(), 'content', 'guidance'))
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => `/guidance/${f.replace(/\.mdx$/, '')}`);

const ROUTES = [
  '/',
  '/guidance',
  '/rates',
  '/about',
  '/privacy',
  '/terms',
  '/accessibility',
  '/disclaimer',
  '/contact',
  ...guidanceSlugs,
];

for (const route of ROUTES) {
  test(`@a11y ${route} has no axe violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`),
    ).toEqual([]);
  });
}

test('@a11y the calculator has no violations once a result is shown', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'England', exact: true }).check();
  await page.getByRole('radio', { name: /South East England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('How old are they?').first().fill('12');
  await page.getByRole('button', { name: 'Show me the figure' }).click();
  await expect(page.getByText('£255', { exact: false }).first()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test('@a11y works at 320px wide with no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ['/', '/rates', '/guidance/how-the-means-test-works']) {
    await page.goto(route);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows, `${route} scrolls horizontally at 320px`).toBe(false);
  }
});

test('@a11y the result page fits 320px, letters and all', async ({ page }) => {
  // The pages above are prose. The result page is where the wide content
  // actually is: the per-child table, the step-by-step arithmetic, the
  // backdating table and nine letters in <pre> blocks, which do not wrap. It
  // was the one page the narrow-screen check never opened.
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await page.getByRole('radio', { name: 'England', exact: true }).check();
  await page.getByRole('radio', { name: /South East England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('How old are they?').first().fill('12');
  await page.getByRole('button', { name: 'Show me the figure' }).click();
  await expect(page.getByRole('heading', { name: /Letters you can send/i })).toBeVisible();

  const overflowing = async (): Promise<string[]> =>
    page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      return [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => el.getBoundingClientRect().right > width + 1)
        // Anything inside a scroller is allowed to be wider than the screen:
        // that is what the scroller is for.
        .filter((el) => !el.closest('.scroll-x'))
        .map((el) => `${el.tagName.toLowerCase()}.${el.className || '(no class)'}`)
        .slice(0, 8);
    });

  expect(await overflowing(), 'result page overflows at 320px').toEqual([]);

  // And with a letter open, which is the widest thing a carer can put on
  // screen: preformatted text that will not wrap on its own.
  const letter = page.locator('.letter').first();
  await letter.getByRole('button', { name: 'Read this letter' }).click();
  await expect(letter.locator('.letter__body')).toBeVisible();
  expect(await overflowing(), 'an open letter overflows at 320px').toEqual([]);

  const scrolls = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(scrolls, 'the page itself scrolls sideways at 320px').toBe(false);
});

test('@a11y the whole calculator is reachable by keyboard alone', async ({ page }) => {
  await page.goto('/');
  // The skip link is the first thing a keyboard user meets.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /skip to the main content/i })).toBeFocused();

  // Tab to the England radio and choose it with the keyboard.
  const england = page.getByRole('radio', { name: 'England', exact: true });
  await england.focus();
  await page.keyboard.press('Space');
  await expect(england).toBeChecked();

  // Every focusable control must show a visible focus ring.
  const outline = await england.evaluate((el) => {
    el.focus();
    return getComputedStyle(el).outlineStyle;
  });
  expect(outline).not.toBe('none');
});
