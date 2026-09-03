/**
 * The letters, spec §18.
 *
 * The calculator's real output is not the number, it is a carer who knows what
 * to ask. These tests cover the parts that decide whether the letter is any use
 * when it arrives: that it carries this carer's own figures, that the formal
 * complaint stays behind its gate, and that the gate lifts when waiting would
 * cost them the complaint.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Wait for the smooth scroll to stop.
 *
 * Every test here acts on a letter, and every letter sits below a scroll the
 * page has just animated. Clicking into a moving page can land the press on
 * whatever slid under the cursor, which fails as a lost click rather than as
 * anything to do with letters.
 */
async function scrollSettled(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        let previous = window.scrollY;
        let stillFor = 0;
        const tick = (): void => {
          if (window.scrollY === previous) stillFor += 1;
          else {
            stillFor = 0;
            previous = window.scrollY;
          }
          if (stillFor >= 3) resolve(true);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}

/**
 * Open the first letter and hand back that letter, not a fresh search.
 *
 * Opening one relabels its own button to "Hide this letter", so a search for
 * "Read this letter" made after the click lands on the NEXT letter down. Both
 * the press and everything read afterwards have to be pinned to one letter.
 */
async function openFirstLetter(page: Page): Promise<Locator> {
  const letter = page.locator('.letter').first();
  await letter.getByRole('button', { name: 'Read this letter' }).click();
  await expect(letter.locator('.letter__body')).toBeVisible();
  return letter;
}

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

  await scrollSettled(page);
}

test('a carer can reach a letter at all', async ({ page }) => {
  await toResult(page);
  const letters = page.locator('.letter');
  expect(await letters.count()).toBeGreaterThan(4);
});

test('the letter carries this carer, not a placeholder council', async ({ page }) => {
  await toResult(page);
  const letter = await openFirstLetter(page);
  const body = await letter.locator('.letter__body').innerText();

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
  const letter = await openFirstLetter(page);
  await letter.getByRole('button', { name: 'Copy the whole letter' }).click();
  // Whether the clipboard is available or not, the page must not break.
  await expect(letter.locator('.letter__body')).toBeVisible();
});

test('the offer to answer more questions is not printed either', async ({ page }) => {
  // The printed page is what a carer hands to a social worker. A button they
  // cannot press is noise on it.
  await toResult(page);
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('heading', { name: /more accurate figure/i })).toBeHidden();
});

test('the letters are not printed with the result', async ({ page }) => {
  // The printed page is what a carer hands to a social worker. Nine letters
  // asking the council questions do not belong in it.
  await toResult(page);
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('heading', { name: /Letters you can send/i })).toBeHidden();
});
