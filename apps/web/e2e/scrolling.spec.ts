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

  // Poll rather than measure once. The scroll is animated, so a single reading
  // taken after "scrollY > 0" samples the middle of the animation, and where
  // that lands depends on how loaded the machine is. An earlier version of this
  // test did exactly that and reported a regression that was not there: left to
  // finish, the heading settles about a quarter of the way down the screen.
  // One polled assertion covering both bounds. Two separate reads are not safe
  // here: the result step focuses the step heading and then scrolls to the
  // results panel, so there is a moment in between when the figure is above the
  // viewport. Asserting the range in a single retrying check waits for the
  // whole sequence to finish instead of catching it halfway.
  await expect
    .poll(
      async () => {
        const v = await verticalPosition(page, 'h2#maximum-heading');
        return v > -0.1 && v < 0.5;
      },
      {
        message:
          'the headline figure never settled in the upper part of the screen. Run the probe in ' +
          'scrolling.spec.ts to see where it lands.',
        timeout: 5000,
      },
    )
    .toBe(true);
});

test('adding a child moves you to the new row and puts the cursor in it', async ({ page }) => {
  await toChildren(page);
  await page.getByLabel('How old are they?').nth(0).fill('12');
  await page.getByRole('button', { name: 'Add another child' }).click();

  // Focus lands in the new child's age box, ready to type.
  await expect(page.getByLabel('How old are they?').nth(1)).toBeFocused();

  // Poll rather than measure once. Focus is set at the start of the scroll, so
  // a single reading taken here catches the row wherever the animation happened
  // to have got to, which on a phone is still below the fold. Left to finish it
  // settles about a tenth of the way down the screen.
  await expect
    .poll(
      async () => {
        const top = await verticalPosition(page, '[data-child-key]:nth-of-type(2)');
        return top > 0 && top < 0.5;
      },
      { message: 'the new child row never settled in view', timeout: 5000 },
    )
    .toBe(true);

  // And it is the whole row that is on screen, not just the box. Scrolling to
  // the box alone left "Child 2" above the top edge, so you were typing into an
  // unlabelled field.
  await expect(page.locator('[data-child-key]:nth-of-type(2) > legend')).toBeInViewport();
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
