/**
 * The form must not lose or shuffle what someone has typed.
 *
 * These exist because a user reported answers vanishing when they removed a
 * child, and a shared link dropping them back at the first question. Filling
 * this form is the tedious part of using the site; losing an answer is the
 * point at which someone gives up.
 */
import { expect, test, type Page } from '@playwright/test';

async function toChildren(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('radio', { name: 'England', exact: true }).check();
  await page.getByRole('radio', { name: /South East England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
}

const age = (page: Page, i: number) => page.getByLabel('How old are they?').nth(i);

async function addChild(page: Page, i: number, years: string): Promise<void> {
  if (i > 0) await page.getByRole('button', { name: 'Add another child' }).click();
  await age(page, i).fill(years);
}

test.describe('removing a child', () => {
  test('keeps the first child’s age when the second is removed', async ({ page }) => {
    await toChildren(page);
    await addChild(page, 0, '12');
    await addChild(page, 1, '5');
    await page.getByRole('button', { name: 'Remove child 2' }).click();
    await expect(age(page, 0)).toHaveValue('12');
    await expect(page.getByLabel('How old are they?')).toHaveCount(1);
  });

  test('keeps the remaining ages when the middle child is removed', async ({ page }) => {
    await toChildren(page);
    await addChild(page, 0, '12');
    await addChild(page, 1, '5');
    await addChild(page, 2, '9');
    await page.getByRole('button', { name: 'Remove child 2' }).click();
    await expect(age(page, 0)).toHaveValue('12');
    await expect(age(page, 1)).toHaveValue('9');
  });

  test('keeps the later ages when the first child is removed', async ({ page }) => {
    await toChildren(page);
    await addChild(page, 0, '12');
    await addChild(page, 1, '5');
    await addChild(page, 2, '9');
    await page.getByRole('button', { name: 'Remove child 1' }).click();
    await expect(age(page, 0)).toHaveValue('5');
    await expect(age(page, 1)).toHaveValue('9');
  });

  test('keeps the other answers, not just the age', async ({ page }) => {
    // The disability tick and the "in care" answer are per child too, and a
    // list keyed by position moves them onto the wrong child rather than
    // losing them, which is worse because it is silent.
    await toChildren(page);
    await addChild(page, 0, '12');
    await page.getByRole('checkbox', { name: /disability or additional needs/i }).nth(0).check();
    await page.getByRole('radio', { name: 'Yes', exact: true }).nth(0).check();
    await addChild(page, 1, '5');
    await addChild(page, 2, '9');

    await page.getByRole('button', { name: 'Remove child 2' }).click();

    await expect(age(page, 0)).toHaveValue('12');
    await expect(
      page.getByRole('checkbox', { name: /disability or additional needs/i }).nth(0),
    ).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Yes', exact: true }).nth(0)).toBeChecked();
    // And child 2's row is now the one that was third, with nothing ticked.
    await expect(age(page, 1)).toHaveValue('9');
    await expect(
      page.getByRole('checkbox', { name: /disability or additional needs/i }).nth(1),
    ).not.toBeChecked();
  });

  test('survives removing several children in a row', async ({ page }) => {
    await toChildren(page);
    await addChild(page, 0, '1');
    await addChild(page, 1, '4');
    await addChild(page, 2, '9');
    await addChild(page, 3, '14');
    await page.getByRole('button', { name: 'Remove child 2' }).click();
    await page.getByRole('button', { name: 'Remove child 2' }).click();
    await expect(page.getByLabel('How old are they?')).toHaveCount(2);
    await expect(age(page, 0)).toHaveValue('1');
    await expect(age(page, 1)).toHaveValue('14');
  });
});

test.describe('shared links', () => {
  test('open on the result, not back at the first question', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await toChildren(page);
    await addChild(page, 0, '12');
    await page.getByRole('button', { name: 'Show me the figure' }).click();
    await expect(page.getByText('£255', { exact: false }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Copy the link' }).click();
    const shared = await page.evaluate(() => navigator.clipboard.readText());

    await page.goto(shared);
    // The figure, straight away, without pressing anything.
    await expect(page.getByText('£255', { exact: false }).first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /most your council should be starting from/i }),
    ).toBeVisible();
  });

  test('carry several children and their ages', async ({ page }) => {
    await page.goto('/?n=england&r=london&c=2,11,16');
    await expect(page.getByRole('heading', { name: /starting from/i })).toBeVisible();
    const body = await page.locator('body').innerText();
    // London 0-2, 11-15 and 16-17 rates, all three present.
    expect(body).toContain('£205');
    expect(body).toContain('£266');
    expect(body).toContain('£309');
  });

  test('a link with no answers still shows the form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Where do you live/i })).toBeVisible();
  });

  test('a half-finished link leaves you where the answer is missing', async ({ page }) => {
    // Ages but no region: we cannot calculate, so do not pretend to.
    await page.goto('/?n=england&c=12');
    await expect(page.getByRole('heading', { name: /Where do you live/i })).toBeVisible();
  });

  test('rubbish in the link does not break the page', async ({ page }) => {
    for (const q of [
      '?n=narnia&r=middle-earth&c=abc',
      '?c=99,-4,17',
      '?c=' + '9,'.repeat(500),
      '?n=england&r=london&d=1,2,3',
      '?la=<script>alert(1)</script>',
    ]) {
      await page.goto(`/${q}`);
      await expect(page.locator('body')).toBeVisible();
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/\bNaN\b|\bInfinity\b/);
      expect(body.length).toBeGreaterThan(100);
    }
  });
});
