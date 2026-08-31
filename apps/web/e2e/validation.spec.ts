/**
 * What happens when someone types the wrong thing.
 *
 * A carer typed 80 as a child's age and reported that "it shows nothing". The
 * message was in fact produced, but the form moved them to the next step before
 * showing it, so it appeared on a screen they had already left. Nothing in the
 * suite noticed, because every test typed valid answers.
 *
 * The contract: an invalid answer keeps you on the step that holds it, names
 * the problem beside the box as well as at the top, and says something a person
 * can act on.
 */
import { expect, test, type Page } from '@playwright/test';

async function toChildren(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('radio', { name: 'England', exact: true }).check();
  await page.getByRole('radio', { name: /South East England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
}

const BAD_AGES = ['80', '18', '-3', 'abc', ''];

for (const bad of BAD_AGES) {
  test(`an age of "${bad}" keeps you on the step and explains itself`, async ({ page }) => {
    await toChildren(page);
    await page.getByLabel('How old are they?').nth(0).fill(bad);
    await page.getByRole('button', { name: 'Show me the figure' }).click();

    // 1. Still on the step with the box that needs fixing.
    await expect(page.getByRole('heading', { name: /About the children/i })).toBeVisible();
    await expect(page.getByLabel('How old are they?').nth(0)).toBeVisible();

    // 2. No result, because there is no valid answer.
    await expect(page.getByRole('heading', { name: /starting from/i })).toHaveCount(0);

    // 3. A message beside the box, not only in the summary at the top.
    const inline = page.locator('#age-error-0');
    await expect(inline).toBeVisible();
    await expect(page.getByLabel('How old are they?').nth(0)).toHaveAttribute('aria-invalid', 'true');

    // 4. Written for a person, not for a developer.
    const text = (await inline.innerText()).toLowerCase();
    expect(text, `unhelpful message: ${text}`).not.toMatch(/expected|received|nan|undefined|invalid_/);
    expect(text.length).toBeGreaterThan(15);
  });
}

test('the summary at the top links to the box that is wrong', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('80');
  await page.getByRole('button', { name: 'Show me the figure' }).click();

  await expect(page.getByRole('heading', { name: /There is a problem/i })).toBeVisible();
  const link = page.getByRole('link', { name: /under 18/i });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '#age-0');
});

test('fixing the age lets you through', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('80');
  await page.getByRole('button', { name: 'Show me the figure' }).click();
  await expect(page.locator('#age-error-0')).toBeVisible();

  await page.getByLabel('How old are they?').nth(0).fill('12');
  await page.getByRole('button', { name: 'Show me the figure' }).click();

  await expect(page.getByText('£255', { exact: false }).first()).toBeVisible();
  await expect(page.locator('#age-error-0')).toHaveCount(0);
});

test('the wrong child is named when there are several', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('12');
  await page.getByRole('button', { name: 'Add another child' }).click();
  await page.getByLabel('How old are they?').nth(1).fill('99');
  await page.getByRole('button', { name: 'Show me the figure' }).click();

  // The message sits on child 2, not child 1.
  await expect(page.locator('#age-error-1')).toBeVisible();
  await expect(page.locator('#age-error-0')).toHaveCount(0);
});

test('an error on a fifth child still links to its box', async ({ page }) => {
  // The anchor list used to stop at four children, so a fifth linked nowhere.
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('1');
  for (let i = 1; i < 5; i++) {
    await page.getByRole('button', { name: 'Add another child' }).click();
    await page.getByLabel('How old are they?').nth(i).fill(i === 4 ? '77' : String(i + 1));
  }
  await page.getByRole('button', { name: 'Show me the figure' }).click();
  await expect(page.locator('#age-error-4')).toBeVisible();
  await expect(page.getByRole('link', { name: /under 18/i })).toHaveAttribute('href', '#age-4');
});

test('removing a child puts focus on the child above it', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('12');
  await page.getByRole('button', { name: 'Add another child' }).click();
  await page.getByLabel('How old are they?').nth(1).fill('5');
  await page.getByRole('button', { name: 'Add another child' }).click();
  await page.getByLabel('How old are they?').nth(2).fill('9');

  await page.getByRole('button', { name: 'Remove child 3' }).click();
  // Lands on child 2, the one above the gap.
  await expect(page.getByLabel('How old are they?').nth(1)).toBeFocused();
  await expect(page.getByLabel('How old are they?').nth(1)).toHaveValue('5');
});

test('removing the first child falls back to Add another child', async ({ page }) => {
  // There is nothing above the first child to land on.
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('12');
  await page.getByRole('button', { name: 'Add another child' }).click();
  await page.getByLabel('How old are they?').nth(1).fill('5');

  await page.getByRole('button', { name: 'Remove child 1' }).click();
  await expect(page.getByRole('button', { name: 'Add another child' })).toBeFocused();
  const onBody = await page.evaluate(() => document.activeElement === document.body);
  expect(onBody, 'focus was lost to the document body').toBe(false);
});
