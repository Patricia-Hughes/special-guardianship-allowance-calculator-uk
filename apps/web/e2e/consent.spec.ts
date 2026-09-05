/**
 * Consent has to come before the cookie, not after it.
 *
 * The privacy notice tells a carer that nothing counts their visit until they
 * say yes. That sentence is only true while the code keeps its side of it, and
 * the failure mode is silent: a tag loaded one line too early looks identical
 * on screen and breaks the promise completely.
 *
 * These tests hold both halves of the contract. In a build with no measurement
 * ID there is no banner and no tag at all, which is also correct, so each test
 * states which case it is in rather than skipping quietly.
 */
import { expect, test, type Page } from '@playwright/test';

const GOOGLE = /googletagmanager\.com|google-analytics\.com/;

/** Record every attempt to reach Google, and stop it going anywhere real. */
async function watchGoogle(page: Page): Promise<string[]> {
  const hits: string[] = [];
  await page.route(GOOGLE, (route) => {
    hits.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  return hits;
}

const banner = (page: Page) => page.getByRole('region', { name: 'Cookies on this site' });

test('@consent nothing reaches Google before an answer is given', async ({ page }) => {
  const hits = await watchGoogle(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(hits, 'a tag loaded before the reader was asked').toEqual([]);

  if (await banner(page).isVisible()) {
    await expect(banner(page).getByRole('button', { name: 'Yes, that is fine' })).toBeVisible();
    await expect(banner(page).getByRole('button', { name: 'No thank you' })).toBeVisible();
  }
});

test('@consent saying no keeps it that way, including after a reload', async ({ page }) => {
  const hits = await watchGoogle(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  test.skip(!(await banner(page).isVisible()), 'this build carries no analytics');

  await banner(page).getByRole('button', { name: 'No thank you' }).click();
  await expect(banner(page)).toBeHidden();

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(banner(page), 'the question came back after it was answered').toBeHidden();
  expect(hits, 'a tag loaded despite the reader saying no').toEqual([]);
});

test('@consent saying yes loads the tag, and only then', async ({ page }) => {
  const hits = await watchGoogle(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  test.skip(!(await banner(page).isVisible()), 'this build carries no analytics');

  expect(hits).toEqual([]);
  await banner(page).getByRole('button', { name: 'Yes, that is fine' }).click();
  await expect(banner(page)).toBeHidden();

  await expect
    .poll(() => hits.length, { message: 'consent was given but no tag was requested' })
    .toBeGreaterThan(0);
  expect(hits[0]).toContain('googletagmanager.com/gtag/js');
});

test('@consent the answer can be changed on the privacy page', async ({ page }) => {
  await watchGoogle(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  test.skip(!(await banner(page).isVisible()), 'this build carries no analytics');

  await banner(page).getByRole('button', { name: 'No thank you' }).click();
  await page.goto('/privacy');
  await expect(page.getByText('You have said no to analytics cookies')).toBeVisible();

  await page.getByRole('button', { name: 'Turn analytics on' }).click();
  await expect(page.getByText('You have said yes to analytics cookies')).toBeVisible();
});

test('@consent the privacy notice matches what the build actually does', async ({ page }) => {
  await page.goto('/');
  const hasBanner = await banner(page).isVisible();
  await page.goto('/privacy');

  if (hasBanner) {
    await expect(page.getByRole('heading', { name: 'Changing your mind' })).toBeVisible();
    await expect(page.getByText('I do not run analytics on this site')).toHaveCount(0);
  } else {
    await expect(page.getByText('I do not run analytics on this site')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Changing your mind' })).toHaveCount(0);
  }
});
