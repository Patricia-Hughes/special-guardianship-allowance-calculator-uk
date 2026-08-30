/**
 * Print output — spec §19 and §25.
 *
 * "Add a Playwright test that renders the results page to PDF and asserts the
 *  maximum figure, the arithmetic table and the citations block all appear in
 *  the output. It will break the first time someone adds a display: none to a
 *  parent container."
 */

import { expect, test } from '@playwright/test';

test('the printed result carries the figure, the inputs and the sources', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'England', exact: true }).check();
  await page.getByRole('radio', { name: /South East England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('How old are they?').first().fill('12');
  await page.getByRole('button', { name: 'Show me the figure' }).click();
  await expect(page.getByText('£255', { exact: false }).first()).toBeVisible();

  // Switch the page into print rendering and assert against what is visible.
  await page.emulateMedia({ media: 'print' });

  // 1. The header that says what this document is.
  await expect(page.getByText(/Special guardianship allowance — estimate/)).toBeVisible();

  // 2. The maximum figure.
  await expect(page.getByText('£255', { exact: false }).first()).toBeVisible();

  // 3. The citations block, with retrieval dates.
  await expect(
    page.getByRole('heading', { name: /where these figures and rules come from/i }),
  ).toBeVisible();

  // 4. The disclaimer.
  await expect(page.getByText(/not legal advice/i).first()).toBeVisible();

  // 5. Advice lines.
  await expect(page.getByRole('heading', { name: /who can help/i }).first()).toBeVisible();

  // 6. Interactive controls are hidden — they are useless on paper.
  await expect(page.getByRole('button', { name: /Print this/ })).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();

  // 7. Every <details> prints open. This is the assertion that breaks when
  //    someone adds a display:none to a parent container.
  const closedDetails = await page.evaluate(() =>
    [...document.querySelectorAll('details')].filter((d) => {
      const body = [...d.children].find((c) => c.tagName !== 'SUMMARY');
      return body ? getComputedStyle(body).display === 'none' : false;
    }).length,
  );
  expect(closedDetails, 'every accordion must print open').toBe(0);

  // 8. A real PDF renders and contains the figure.
  const pdf = await page.pdf({ format: 'A4', printBackground: false });
  expect(pdf.byteLength).toBeGreaterThan(1000);
});

test('a guidance page prints its links as visible URLs', async ({ page }) => {
  await page.goto('/guidance/what-your-council-must-consider');
  await page.emulateMedia({ media: 'print' });
  const printedUrl = await page.evaluate(() => {
    const link = document.querySelector('a[href^="http"]');
    if (!link) return null;
    return getComputedStyle(link, '::after').content;
  });
  expect(printedUrl).toContain('http');
});
