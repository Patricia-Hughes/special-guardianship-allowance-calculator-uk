/**
 * The page must take you to whatever just changed.
 *
 * The form grows and shrinks as you use it, and on a phone the part that
 * changed is usually below the fold. Someone who presses a button and sees
 * nothing move concludes the button is broken.
 *
 * Focus is asserted alongside position throughout. Scrolling is what a sighted
 * user notices; focus is what a screen reader and a keyboard follow, and it is
 * the one that must not be lost when a row is removed from under it.
 */
import { expect, test, type Page } from '@playwright/test';

async function toChildren(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('radio', { name: 'England', exact: true }).check();
  await page.getByRole('radio', { name: /South East England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
}

/**
 * Wait for a smooth scroll to finish.
 *
 * Measuring position after `scrollY > 0` measures mid-animation, so the number
 * depends on how loaded the machine is. That is a race in the test rather than
 * in the page, and it failed once under a full parallel run while passing alone,
 * which is the signature. Poll until the position stops moving instead.
 */
async function scrollSettled(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const start = window.scrollY;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(Math.abs(window.scrollY - start) < 1)),
        );
      }),
    undefined,
    { timeout: 5000 },
  );
}

/** How far down the viewport an element sits, as a fraction of its height. */
async function verticalPosition(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return Number.NaN;
    return el.getBoundingClientRect().top / window.innerHeight;
  }, selector);
}

test('moving to the next step brings that step into view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'England', exact: true }).check();
  await page.getByRole('radio', { name: /South East England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: /About the children/i })).toBeVisible();
  // And focus is on the heading, so a screen reader announces the new step.
  const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
  expect(focused).toMatch(/About the children/i);
});

test('the result is scrolled to, not left below the fold', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('12');
  await page.getByRole('button', { name: 'Show me the figure' }).click();

  await expect(page.getByText('£255', { exact: false }).first()).toBeVisible();
  await page.waitForFunction(() => window.scrollY > 0 || document.body.scrollHeight <= window.innerHeight);
  await scrollSettled(page);

  // The headline figure should be in the upper half of the screen, not off it.
  const pos = await verticalPosition(page, 'h2#maximum-heading');
  expect(pos, 'the result heading is not on screen').toBeLessThan(0.9);
  expect(pos, 'the result heading is above the viewport').toBeGreaterThan(-0.5);
});

test('adding a child moves you to the new row and puts the cursor in it', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('12');
  await page.getByRole('button', { name: 'Add another child' }).click();

  // Focus lands in the new child's age box, ready to type.
  await expect(page.getByLabel('How old are they?').nth(1)).toBeFocused();
  const pos = await verticalPosition(page, '[data-child-key]:nth-of-type(2)');
  expect(pos, 'the new child row is off screen').toBeLessThan(1);
});

test('removing a child moves focus to the child above it', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('12');
  await page.getByRole('button', { name: 'Add another child' }).click();
  await page.getByLabel('How old are they?').nth(1).fill('5');

  await page.getByRole('button', { name: 'Remove child 2' }).click();

  // The child above the gap, which is where the eye already is. Without any of
  // this, focus falls back to <body> and a keyboard user tabs from the top of
  // the document again.
  await expect(page.getByLabel('How old are they?').nth(0)).toBeFocused();
  const onBody = await page.evaluate(() => document.activeElement === document.body);
  expect(onBody, 'focus was lost to the document body').toBe(false);
});

test('several children in a row each get focus as they are added', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('1');
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: 'Add another child' }).click();
    await expect(page.getByLabel('How old are they?').nth(i)).toBeFocused();
    await page.keyboard.type(String(i * 4));
  }
  await expect(page.getByLabel('How old are they?').nth(1)).toHaveValue('4');
  await expect(page.getByLabel('How old are they?').nth(2)).toHaveValue('8');
  await expect(page.getByLabel('How old are they?').nth(3)).toHaveValue('12');
});

test('scrolling is instant when the visitor has asked for less motion', async ({ browser }) => {
  // Smooth scrolling is unpleasant, and for some people genuinely unwell-making,
  // when motion is turned down. They should still be taken to the right place.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.getByRole('radio', { name: 'England', exact: true }).check();
  await page.getByRole('radio', { name: /South East England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: /About the children/i })).toBeVisible();
  await ctx.close();
});
