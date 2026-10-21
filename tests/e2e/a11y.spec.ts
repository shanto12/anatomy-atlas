import { expect, test } from './fixtures';

import {
  ALL_ROUTES,
  capture,
  expectAccessible,
  expectVisibleFocus,
  gotoApp,
  tabUntil,
  writeReport,
} from './helpers';

const A11Y_ROUTES = [...ALL_ROUTES, '/quiz/final'];

test.describe('accessibility (axe)', () => {
  for (const route of A11Y_ROUTES) {
    test(`axe: ${route} has no serious or critical violations`, async ({ page }, testInfo) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status() ?? 0, `HTTP status for ${route}`).toBeLessThan(400);
      await expect(page.locator('main h1').first()).toBeVisible();
      await page.waitForLoadState('networkidle').catch(() => undefined);
      const summary = await expectAccessible(page, testInfo, `axe${route.replace(/[^a-z0-9]+/gi, '-')}`, route);
      writeReport(`a11y-${testInfo.project.name}-${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}.json`, summary);
    });
  }

  test('axe: open search dialog has no serious or critical violations', async ({ page }, testInfo) => {
    await gotoApp(page, '/');
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: /search the atlas/i });
    await expect(dialog).toBeVisible();
    await page.getByRole('combobox', { name: /search the atlas/i }).fill('heart');
    await expect(dialog.locator('a[href="/organs/heart"]').first()).toBeVisible();
    await expectAccessible(page, testInfo, 'axe-search-dialog-open', '/ search dialog open');
  });

  test('axe: quiz in progress has no serious or critical violations', async ({ page }, testInfo) => {
    await gotoApp(page, '/quiz/cardiovascular');
    await page.getByRole('button', { name: /start quiz/i }).click();
    await expect(page.locator('.question-card')).toBeVisible();
    await expectAccessible(page, testInfo, 'axe-quiz-in-progress', '/quiz/cardiovascular in progress');
  });
});

test.describe('keyboard-only journeys', () => {
  test('keyboard-only organ selection: Tab to an organ and open its entry', async ({ page }) => {
    await gotoApp(page, '/systems/cardiovascular');
    const found = await tabUntil(page, (active) => (active.href ?? '').startsWith('/organs/'), 150);
    expect(found, 'an organ link must be reachable with Tab').not.toBeNull();
    await expectVisibleFocus(page);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/organs\/[a-z-]+$/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('keyboard-only quiz flow: start, answer, submit, next', async ({ page }, testInfo) => {
    await gotoApp(page, '/quiz/cardiovascular');

    const start = await tabUntil(page, (active) => /start quiz/i.test(active.text), 80);
    expect(start, 'Start quiz must be keyboard reachable').not.toBeNull();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Question 1 of 8', { exact: true }).first()).toBeVisible();

    const radio = await tabUntil(page, (active) => active.type === 'radio', 40);
    expect(radio, 'quiz options must be keyboard reachable').not.toBeNull();
    await page.keyboard.press('Space');
    const submit = await tabUntil(page, (active) => /submit answer/i.test(active.text), 20);
    expect(submit, 'Submit answer must be keyboard reachable').not.toBeNull();
    await page.keyboard.press('Enter');
    await expect(page.locator('.quiz-feedback__explanation')).toBeVisible();

    // Focus is moved to the next action after a revealed answer.
    const nextButton = page.getByRole('button', { name: /next question|see results/i });
    await expect(nextButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Question 2 of 8', { exact: true }).first()).toBeVisible();

    await capture(page, testInfo, 'keyboard-quiz', { fullPage: false });
  });

  test('keyboard-only lesson reading: Tab to next step and advance', async ({ page }) => {
    await gotoApp(page, '/learn/lesson-cardiovascular');
    const next = await tabUntil(page, (active) => /next step/i.test(active.text), 120);
    expect(next, 'Next step must be keyboard reachable').not.toBeNull();
    await page.keyboard.press('Enter');
    await expect(page.locator('.lesson-step__kicker')).toContainText('Step 2');
  });

  test('skip link jumps to main content and focus indicators are visible', async ({ page }) => {
    await gotoApp(page, '/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
    await gotoApp(page, '/systems');
    const link = await tabUntil(page, (active) => active.tag === 'A', 5);
    expect(link).not.toBeNull();
    await expectVisibleFocus(page);
  });
});
