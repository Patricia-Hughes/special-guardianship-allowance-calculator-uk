/**
 * The five E2E journeys — spec §34.
 *
 * Each is a real person with a real question. If one of these breaks, someone
 * cannot find out what they are owed.
 */

import { expect, test, type Page } from '@playwright/test';

async function chooseNation(page: Page, label: string): Promise<void> {
  await page.getByRole('radio', { name: label, exact: true }).check();
}

async function setAge(page: Page, age: string, index = 0): Promise<void> {
  await page.getByLabel('How old are they?').nth(index).fill(age);
}

test.describe('journeys', () => {
  test('1: grandmother, one 12-year-old, South East, no finances → £255/week, prints', async ({
    page,
  }) => {
    await page.goto('/');

    // Interaction 1: nation and region.
    await chooseNation(page, 'England');
    await page.getByRole('radio', { name: /South East England/ }).check();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Interaction 2: the child's age.
    await setAge(page, '12');

    // Interaction 3: show me the figure.
    await page.getByRole('button', { name: 'Show me the figure' }).click();

    // The number she came for.
    await expect(page.getByText('£255', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /most your council should be starting from/i })).toBeVisible();
    // The annual figure, and the source of the rule.
    await expect(page.getByText('£13,260')).toBeVisible();
    await expect(page.getByRole('heading', { name: /where these figures and rules come from/i })).toBeVisible();

    // And she can print it.
    await expect(page.getByRole('button', { name: /Print this/ })).toBeVisible();
  });

  test('2: former foster carer, reg 7 floor holds at £300', async ({ page }) => {
    await page.goto('/');
    await chooseNation(page, 'England');
    await page.getByRole('radio', { name: /South East England/ }).check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await setAge(page, '8');
    await page.getByRole('button', { name: 'Show me the figure' }).click();
    await page.getByRole('button', { name: 'Answer a few more questions' }).click();

    await page.getByRole('checkbox', { name: /was this child's foster carer/i }).check();
    await page.getByLabel(/What were you paid as a foster carer/).fill('300');
    await page.getByLabel(/how many months ago was the order made/i).fill('14');
    await page.getByRole('button', { name: 'Continue' }).click();

    // The floor holds the figure at the previous fostering allowance, above the
    // South East 5-10 maximum of £223 — and the protected figure is shown as a
    // headline, not buried in a flag.
    await expect(
      page.getByRole('heading', { name: /your figure is protected at a higher amount/i }),
    ).toBeVisible();
    await expect(page.getByText('£300 a week').first()).toBeVisible();
    await expect(page.getByText('£223', { exact: false }).first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /two-year protection|previous fostering allowance/i }).first(),
    ).toBeVisible();
  });

  test('3: carer on Universal Credit whose council deducts Child Benefit', async ({ page }) => {
    await page.goto('/');
    await chooseNation(page, 'England');
    await page.getByRole('radio', { name: /Anywhere else in England/ }).check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await setAge(page, '10');
    await page.getByRole('button', { name: 'Show me the figure' }).click();
    await page.getByRole('button', { name: 'Answer a few more questions' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('checkbox', { name: /means-tested benefit/i }).check();
    await page.getByRole('checkbox', { name: 'Universal Credit' }).check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('checkbox', { name: /takes Child Benefit off/i }).check();
    await page.getByRole('button', { name: 'Update my result' }).click();

    // The maximum-only path does not deduct, so the flag is the outcome that
    // matters: the carer is told the deduction is contested, and where to read.
    await expect(page.getByRole('link', { name: /read more about this/i }).first()).toBeVisible();
    await page.goto('/guidance/child-benefit-deduction');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Child Benefit');
  });

  test('4: carer in Bolton, child would otherwise be in care → Kinship Zone', async ({ page }) => {
    await page.goto('/');
    await chooseNation(page, 'England');
    await page.getByLabel(/Which council is responsible/).selectOption('bolton');
    await page.getByRole('button', { name: 'Continue' }).click();

    await setAge(page, '8');
    await page.getByRole('button', { name: 'Show me the figure' }).click();
    await page.getByRole('button', { name: 'Answer a few more questions' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('checkbox', { name: /would be in local authority care/i }).check();
    await page.getByRole('button', { name: 'Update my result' }).click();

    // Full NMA for rest-of-England 5-10, no means test, pilot caveat shown.
    await expect(page.getByText('£201', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/Kinship Zones pilot/i).first()).toBeVisible();
    await expect(page.getByText(/pilot in seven councils|seven councils/i).first()).toBeVisible();
  });

  test('5: carer in Scotland → kinship regime, no English citations anywhere', async ({ page }) => {
    await page.goto('/');
    await chooseNation(page, 'Scotland');
    await page.getByRole('button', { name: 'Continue' }).click();

    await setAge(page, '8');
    await page.getByRole('button', { name: 'Show me the figure' }).click();

    // The Scottish Recommended Allowance for the 5-15 band.
    await expect(page.getByText('£206.71')).toBeVisible();

    // [HARD R5] No English law may appear on a Scottish result.
    const body = (await page.locator('body').textContent()) ?? '';
    for (const forbidden of [
      'Special Guardianship Regulations 2005',
      'regulation 6',
      'reg 6',
      'para 65',
      'Kirklees',
      'Merton',
      'Tower Hamlets',
      'Lewisham',
    ]) {
      expect(body, `Scottish result must not mention "${forbidden}"`).not.toContain(forbidden);
    }
    await expect(page.getByText(/Scottish Recommended Allowance/i).first()).toBeVisible();
  });
});

test.describe('static content works without JavaScript (Tier 3, §32)', () => {
  test.use({ javaScriptEnabled: false });

  test('guides and rate tables still render', async ({ page }) => {
    await page.goto('/rates');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('rates');
    await expect(page.getByText('£255').first()).toBeVisible();

    await page.goto('/guidance/what-your-council-must-consider');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/fostering allowance/i).first()).toBeVisible();

    // The homepage explains the calculator needs JS, rather than showing nothing.
    await page.goto('/');
    await expect(page.getByText(/calculator needs JavaScript/i)).toBeVisible();
    await expect(page.getByText('£309').first()).toBeVisible();
  });
});
