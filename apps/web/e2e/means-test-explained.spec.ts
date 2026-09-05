/**
 * The means test has two flat ends, and the page has to own both of them.
 *
 * Below roughly £1,300 a month nothing is deducted. Above roughly £2,500 the
 * assessed contribution already exceeds the maximum, so the answer is zero and
 * stays zero however much else is typed. Both were reported as "I changed the
 * numbers and nothing happened", which is what a correct calculation looks like
 * when the page does not say what it did.
 *
 * These tests hold the sentence, not the arithmetic: the unit tests already
 * cover the sums.
 */
import { expect, test, type Page } from '@playwright/test';

async function resultFor(page: Page, takeHomePerMonth: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('radio', { name: 'England' }).check();
  await page.getByRole('radio', { name: /Anywhere else in England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('How old are they?').nth(0).fill('9');
  await page.getByRole('button', { name: 'Show me the figure' }).click();
  await page.getByRole('button', { name: 'Answer a few more questions' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel(/Take-home pay, per month/).fill(takeHomePerMonth);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Update my result' }).click();
}

const card = (page: Page) => page.getByRole('region', { name: 'Your estimate after a means test' });

test('a low income says nothing was taken off, rather than repeating the maximum in silence', async ({
  page,
}) => {
  await resultFor(page, '800');
  await expect(card(page)).toContainText('Nothing has been taken off');
  await expect(card(page)).toContainText('not your answers being ignored');
});

test('a middling income names the amount deducted', async ({ page }) => {
  await resultFor(page, '2000');
  await expect(card(page)).toContainText(/£\d+(\.\d\d)? a week has been taken off/);
});

test('a zero result explains itself, and says a council may still pay', async ({ page }) => {
  await resultFor(page, '4000');
  await expect(card(page)).toContainText('reduces the allowance to nothing');
  await expect(card(page)).toContainText('stays at zero however much you change the other boxes');
  await expect(card(page)).toContainText('does not mean your council must pay you nothing');
});
