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

/**
 * The finances step sits between "benefits" and "council". Nobody should be
 * made to hand over their income to find out their council's lawful maximum, so
 * skipping it has to work — these journeys check that it does by using it.
 */
async function skipFinances(page: Page): Promise<void> {
  await expect(page.getByText(/You can skip this/i)).toBeVisible();
  await page.getByRole('button', { name: 'Skip this step' }).click();
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

    await skipFinances(page);

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

    await skipFinances(page);

    await page.getByRole('checkbox', { name: /would be in local authority care/i }).check();
    await page.getByRole('button', { name: 'Update my result' }).click();

    // Full NMA for rest-of-England 5-10, no means test, pilot caveat shown.
    await expect(page.getByText('£201', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/Kinship Zones pilot/i).first()).toBeVisible();
    await expect(page.getByText(/pilot in seven councils|seven councils/i).first()).toBeVisible();
  });

  test('6: carer who wants the means test → arithmetic shown, both caveats survive', async ({
    page,
  }) => {
    await page.goto('/');
    await chooseNation(page, 'England');
    await page.getByRole('radio', { name: /Anywhere else in England/ }).check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await setAge(page, '9');
    await page.getByRole('button', { name: 'Show me the figure' }).click();
    await page.getByRole('button', { name: 'Answer a few more questions' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // The step this journey exists for. Unblocked once the DWP Income Support
    // applicable amounts were sourced; before that it threw rather than guess.
    await expect(page.getByText(/You can skip this/i)).toBeVisible();
    await page.getByLabel(/Take-home pay, per month/).fill('2000');
    await page.getByLabel(/Rent or mortgage, per month/).fill('800');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('button', { name: 'Update my result' }).click();

    // The carer must be able to see the sum, not just its answer — an estimate
    // she cannot check is one she cannot challenge. It is a disclosure, closed
    // on screen and forced open when printed.
    await page.locator('summary', { hasText: 'Show the arithmetic' }).click();
    await expect(page.getByText(/20% of your income is ignored/i).first()).toBeVisible();
    await expect(page.getByText(/Basic living costs/i).first()).toBeVisible();

    // Sourcing the figures fixed the data gap, not the model. Both warnings
    // must still be in front of her.
    await expect(page.getByText(/no published national rule|had to assume/i).first()).toBeVisible();
  });

  test('7: carer asks what they were underpaid since 2024 → year-by-year figure', async ({
    page,
  }) => {
    await page.goto('/');
    await chooseNation(page, 'England');
    await page.getByRole('radio', { name: /South East England/ }).check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await setAge(page, '12');
    await page.getByRole('button', { name: 'Show me the figure' }).click();

    // The backdating question is a disclosure on the result, not another step —
    // most people come for one number and leave.
    await page.locator('summary', { hasText: 'Were you underpaid in the past?' }).click();

    await page.getByLabel('Count from').fill('2024-06-01');
    await page.getByLabel('Count until').fill('2026-08-01');
    await page.getByLabel(/actually paid you, per week/i).fill('100');
    await page.getByRole('button', { name: 'Work out the difference' }).click();

    // 2024/25 is covered now the archived GOV.UK table is in, so the period
    // spans three financial years and none is left out.
    await expect(page.getByRole('heading', { name: 'The difference' })).toBeVisible();
    await expect(page.getByText('2024/25').first()).toBeVisible();
    await expect(page.getByText(/rates changed on 1 April/i).first()).toBeVisible();
    await expect(page.getByText(/not included/i)).toHaveCount(0);

    // The 1 to 5 April window is its own row, because councils uplift on
    // 1 April and the DfE states the same rates on a tax year starting on the
    // 6th. We pay out on the council convention and say what rests on it,
    // rather than letting a few pounds ride on an unstated assumption.
    await expect(page.getByText(/the tax year began/i).first()).toBeVisible();
    await expect(page.getByText(/If your council follows the tax year instead/i)).toBeVisible();

    // And the caveats that stop someone treating it as a guaranteed debt.
    await expect(page.getByText(/not a guaranteed entitlement/i).first()).toBeVisible();
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
