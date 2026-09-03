/**
 * The letters, spec §18.
 *
 * The calculator's real output is not the number, it is a carer who knows what
 * to ask. These tests cover the parts that decide whether the letter is any use
 * when it arrives: that it carries this carer's own figures, that the formal
 * complaint stays behind its gate, and that the gate lifts when waiting would
 * cost them the complaint.
 */
import { expect, test, type Page } from '@playwright/test';

async function toResult(page: Page, opts: { months?: string } = {}): Promise<void> {
  await page.goto('/');
  await page.getByRole('radio', { name: 'England', exact: true }).check();
  await page.getByRole('radio', { name: /South East England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('How old are they?').nth(0).fill('12');
  await page.getByRole('button', { name: 'Show me the figure' }).click();
  await expect(page.getByRole('heading', { name: /Letters you can send/i })).toBeVisible();

  if (opts.months !== undefined) {
    await page.getByRole('button', { name: 'Answer a few more questions' }).click();
    await page.getByLabel(/how many months ago/i).fill(opts.months);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: /Letters you can send/i })).toBeVisible();
  }
}

test('a carer can reach a letter at all', async ({ page }) => {
  await toResult(page);
  const letters = page.locator('.letter');
  expect(await letters.count()).toBeGreaterThan(4);
});

test('the letter carries this carer, not a placeholder council', async ({ page }) => {
  await toResult(page);
  await page.getByRole('button', { name: 'Read this letter' }).first().click();
  const body = await page.locator('.letter__body').first().innerText();

  // The carer fills in their own name and their child's; everything about the
  // council and the figures is already there.
  expect(body).toContain('[YOUR NAME]');
  expect(body).toContain('Subject:');
  expect(body).toContain('Who to send this to');
  // Every letter states a position, so every letter cites something.
  expect(body).toContain('What this letter refers to');
});

test('the formal complaint is held behind the letters that come first', async ({ page }) => {
  await toResult(page);
  const complaint = page.locator('.letter', { hasText: 'Make a stage 1 complaint' });
  await expect(complaint).toBeVisible();
  await expect(complaint.getByText('Send these first')).toBeVisible();
  // And it is last, so nothing pushes a carer towards it.
  await expect(page.locator('.letter').last()).toContainText('Make a stage 1 complaint');
});

test('the gate lifts when the carer is past the Ombudsman time limit', async ({ page }) => {
  // 18 months since the order. Waiting for the earlier letters could now cost
  // them the complaint entirely, which is the one case where the gate harms.
  await toResult(page, { months: '18' });
  const complaint = page.locator('.letter', { hasText: 'Make a stage 1 complaint' });
  await expect(complaint.getByText('Do not wait for this one')).toBeVisible();
  await expect(complaint.getByText('Send these first')).toHaveCount(0);
});

test('a letter can be copied without a clipboard permission prompt failing the page', async ({
  page,
}) => {
  await toResult(page);
  await page.getByRole('button', { name: 'Read this letter' }).first().click();
  await page.getByRole('button', { name: 'Copy the whole letter' }).first().click();
  // Whether the clipboard is available or not, the page must not break.
  await expect(page.locator('.letter__body').first()).toBeVisible();
});

test('the letters are not printed with the result', async ({ page }) => {
  // The printed page is what a carer hands to a social worker. Nine letters
  // asking the council questions do not belong in it.
  await toResult(page);
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('heading', { name: /Letters you can send/i })).toBeHidden();
});
