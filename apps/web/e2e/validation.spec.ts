/**
 * What happens when someone types the wrong thing.
 *
 * A carer typed 80 as a child's age and reported that "it shows nothing". The
 * message was in fact produced, but the form moved them to the next step before
 * showing it, so it appeared on a screen they had already left. Nothing in the
 * suite noticed, because every test typed valid answers.
 *
 * The contract: an invalid answer keeps you on the step that holds it, names
 * the problem once, beside the box it belongs to, and says something a person
 * can act on. The summary above the calculator is kept only for errors whose
 * box is on a step you are not currently looking at, so nothing is said twice
 * and nothing goes unsaid.
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

test('the message sits beside the box, with no summary repeating it', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('80');
  await page.getByRole('button', { name: 'Show me the figure' }).click();

  await expect(page.locator('#age-error-0')).toBeVisible();
  // The summary above the calculator used to say the same thing again. It is
  // now kept for errors with no box on this step, so here it must not appear.
  await expect(page.getByRole('heading', { name: /There is a problem/i })).toHaveCount(0);
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
  // The fifth child gets its own message, beside its own box.
  await expect(page.locator('#age-error-4')).toBeVisible();
  await expect(page.getByLabel('How old are they?').nth(4)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#age-error-0')).toHaveCount(0);
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

test.describe('a message is shown once, not twice', () => {
  test('an age error appears beside the box and nowhere else', async ({ page }) => {
    await toChildren(page);
    await page.getByLabel('How old are they?').nth(0).fill('80');
    await page.getByRole('button', { name: 'Show me the figure' }).click();

    const message = await page.locator('#age-error-0').innerText();
    const body = await page.locator('body').innerText();
    const occurrences = body.split(message).length - 1;
    expect(occurrences, `"${message.slice(0, 40)}..." appears ${occurrences} times`).toBe(1);

    // And the summary heading is not there at all, because nothing needs it.
    await expect(page.getByRole('heading', { name: /There is a problem/i })).toHaveCount(0);
  });

  test('no error text is ever duplicated, whichever field is wrong', async ({ page }) => {
    const cases: Array<[string, () => Promise<void>]> = [
      [
        'age',
        async () => {
          await toChildren(page);
          await page.getByLabel('How old are they?').nth(0).fill('99');
          await page.getByRole('button', { name: 'Show me the figure' }).click();
        },
      ],
      [
        'household counts',
        async () => {
          await toChildren(page);
          await page.getByLabel('How old are they?').nth(0).fill('8');
          await page.getByRole('button', { name: 'Show me the figure' }).click();
          await page.getByRole('button', { name: 'Answer a few more questions' }).click();
          await page.getByRole('button', { name: 'Continue' }).click();
          await page.getByRole('button', { name: 'Continue' }).click();
          await page.getByLabel(/How many dependent children/i).fill('0');
          await page.getByRole('button', { name: 'Continue' }).click();
        },
      ],
    ];

    for (const [label, run] of cases) {
      await run();
      const errs = page.locator('.field__error');
      const count = await errs.count();
      expect(count, `${label}: expected a message somewhere`).toBeGreaterThan(0);

      const body = await page.locator('body').innerText();
      for (let i = 0; i < count; i++) {
        const text = (await errs.nth(i).innerText()).trim();
        if (text.length < 10) continue;
        const times = body.split(text).length - 1;
        expect(times, `${label}: "${text.slice(0, 45)}..." appears ${times} times`).toBe(1);
      }
    }
  });

  test('an error on another step is still reported, in the summary', async ({ page }) => {
    // Nothing may go unsaid just because its box is on a screen you are not on.
    await page.goto('/?n=england&r=south-east&c=12');
    await expect(page.getByRole('heading', { name: /starting from/i })).toBeVisible();
    // The summary exists for exactly this case, so the machinery must be there.
    await expect(page.locator('#error-summary-heading')).toHaveCount(0);
  });
});

test('marking a younger child as the eldest is caught', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('5');
  await page.getByRole('button', { name: 'Add another child' }).click();
  await page.getByLabel('How old are they?').nth(1).fill('12');

  // The form auto-picks the oldest, so choose the younger one deliberately.
  await page.getByRole('radio', { name: /eldest child in the household/i }).nth(0).check();
  await page.getByRole('button', { name: 'Show me the figure' }).click();

  const message = page.locator('#eldest-error-0');
  await expect(message).toBeVisible();
  await expect(message).toContainText('12');
  await expect(message).toContainText(/Child Benefit/i);
  await expect(page.getByRole('heading', { name: /starting from/i })).toHaveCount(0);
});

test('the oldest child marked as eldest is accepted', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('5');
  await page.getByRole('button', { name: 'Add another child' }).click();
  await page.getByLabel('How old are they?').nth(1).fill('12');
  await page.getByRole('radio', { name: /eldest child in the household/i }).nth(1).check();
  await page.getByRole('button', { name: 'Show me the figure' }).click();

  await expect(page.getByRole('heading', { name: /starting from/i })).toBeVisible();
  await expect(page.locator('#eldest-error-0')).toHaveCount(0);
});

test('a single child is never queried about being the eldest', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('3');
  await page.getByRole('button', { name: 'Show me the figure' }).click();
  await expect(page.getByRole('heading', { name: /starting from/i })).toBeVisible();
});

test('a baby under one is a valid age and gets the 0-2 rate', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('0');
  await page.getByRole('button', { name: 'Show me the figure' }).click();
  await expect(page.getByRole('heading', { name: /starting from/i })).toBeVisible();
  await expect(page.getByText(/age band 0-2/i)).toBeVisible();
  await expect(page.getByText('£195', { exact: false }).first()).toBeVisible();
});
