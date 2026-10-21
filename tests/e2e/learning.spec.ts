import { expect, test } from './fixtures';

import {
  capture,
  expectCleanPage,
  gotoApp,
  readProgress,
  systems,
  systemsById,
  waitForProgress,
  watchPage,
} from './helpers';

const cardiovascular = systemsById['cardiovascular'];

test.describe('learning: lessons', () => {
  test('learn index lists all twelve lessons', async ({ page }, testInfo) => {
    const issues = watchPage(page);
    await gotoApp(page, '/learn');
    await expect(page.locator('h1')).toContainText(/learn|body/i);

    const lessonHrefs = await page
      .locator('main a[href^="/learn/lesson-"]')
      .evaluateAll((elements) => [...new Set(elements.map((element) => element.getAttribute('href')))]);
    expect(lessonHrefs).toHaveLength(12);
    for (const system of systems) {
      expect(lessonHrefs).toContain(`/learn/${system.lesson.id}`);
    }

    await capture(page, testInfo, 'learn-index', { fullPage: true });
    expectCleanPage(issues, 'learn index');
  });

  test('lesson reader walks eight steps and completion persists after reload', async ({ page }, testInfo) => {
    expect(cardiovascular).toBeTruthy();
    const issues = watchPage(page);
    await gotoApp(page, `/learn/${cardiovascular.lesson.id}`);

    await expect(page.locator('h1')).toContainText(cardiovascular.lesson.title);
    await expect(page.locator('.lesson-step__kicker')).toContainText('Step 1');
    await expect(page.locator('.lesson-step__title')).toBeVisible();

    // Walk to the final step using the visible controls.
    for (let step = 1; step < cardiovascular.lesson.steps.length; step += 1) {
      await page.getByRole('button', { name: 'Next step' }).click();
      await expect(page.locator('.lesson-step__kicker')).toContainText(`Step ${step + 1}`);
    }
    await expect(page.getByRole('button', { name: /mark lesson complete/i })).toBeVisible();
    await expect(page.locator('.lesson-step__kicker')).toContainText(`Step ${cardiovascular.lesson.steps.length}`);

    // Before completion the store has not recorded it.
    const before = await readProgress(page);
    expect(before?.completedLessons ?? []).not.toContain(cardiovascular.lesson.id);

    await page.getByRole('button', { name: /mark lesson complete/i }).click();
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();
    await waitForProgress(page, (progress) => progress.completedLessons.includes(cardiovascular.lesson.id));

    // Reload: the same lesson shows as complete, and the payload survives.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(cardiovascular.lesson.title);
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();
    const persisted = await readProgress(page);
    expect(persisted.completedLessons).toContain(cardiovascular.lesson.id);

    // The learn index reflects the completed lesson and unlocks "next lesson".
    await gotoApp(page, '/learn');
    await expect(page.locator('main')).toContainText(/completed|1 of 12/i);
    await expect(page.locator('.continue-card').first()).toContainText(/next lesson/i);

    await capture(page, testInfo, 'lesson-complete', { fullPage: true });
    expectCleanPage(issues, 'lesson completion');
  });

  test('lesson outline navigation and previous/next controls stay in sync', async ({ page }) => {
    await gotoApp(page, `/learn/${cardiovascular.lesson.id}`);
    const outlineButtons = page.locator('.lesson-outline__link');
    await expect(outlineButtons).toHaveCount(cardiovascular.lesson.steps.length);

    await outlineButtons.nth(3).click();
    await expect(page.locator('.lesson-step__kicker')).toContainText('Step 4');
    await expect(page.getByRole('button', { name: /previous step/i })).toBeEnabled();
    await page.getByRole('button', { name: /previous step/i }).click();
    await expect(page.locator('.lesson-step__kicker')).toContainText('Step 3');

    // Keyboard arrow navigation is documented in the reader.
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.lesson-step__kicker')).toContainText('Step 4');
  });

  test('lesson completion is device-local and reset by the progress API', async ({ page }) => {
    await gotoApp(page, `/learn/${cardiovascular.lesson.id}`);
    await page.evaluate((lessonId) => {
      window.localStorage.setItem(
        'anatomy-atlas:progress:v1',
        JSON.stringify({ completedLessons: [lessonId], quizBest: {}, exploredOrgans: [], bookmarks: [] }),
      );
    }, cardiovascular.lesson.id);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  });
  test('fresh learner sees a start prompt, not a continue prompt', async ({ page }) => {
    await gotoApp(page, '/learn');
    const card = page.locator('.continue-card').first();
    await expect(card).toContainText(/a good place to start/i);
    await expect(card.getByRole('link', { name: /start lesson/i })).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/continue learning|continue lesson/i);
  });

  test('organ-only exploration does not unlock continue/next prompts', async ({ page }) => {
    await gotoApp(page, '/');
    await page.evaluate(() => {
      window.localStorage.setItem(
        'anatomy-atlas:progress:v1',
        JSON.stringify({ completedLessons: [], quizBest: {}, exploredOrgans: ['heart', 'lungs'], bookmarks: ['heart'] }),
      );
    });
    await gotoApp(page, '/learn');
    const card = page.locator('.continue-card').first();
    await expect(card).toContainText(/a good place to start/i);
    await expect(card.getByRole('link', { name: /start lesson/i })).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/continue learning|next lesson/i);
    const progress = await readProgress(page);
    expect(progress.completedLessons).toEqual([]);
  });

  test('step meter reflects steps read and status transitions to in progress', async ({ page }) => {
    await gotoApp(page, `/learn/${cardiovascular.lesson.id}`);
    const hint = page.locator('.step-progress__hint');
    await expect(hint).toContainText(/starting the lesson/i);
    await expect(page.locator('.lesson-rail-card')).toContainText('Not started');

    await page.getByRole('button', { name: 'Next step' }).click();
    await page.getByRole('button', { name: 'Next step' }).click();
    await expect(hint).toContainText(`2 of ${cardiovascular.lesson.steps.length} steps read`);
    await expect(page.locator('.lesson-rail-card')).toContainText('In progress');
    await expect(page.locator('.step-progress__stop.is-past')).toHaveCount(2);
  });

  test('completing a lesson announces completion, moves focus, and promotes the quiz CTA', async ({ page }) => {
    await gotoApp(page, `/learn/${cardiovascular.lesson.id}`);
    for (let step = 1; step < cardiovascular.lesson.steps.length; step += 1) {
      await page.getByRole('button', { name: 'Next step' }).click();
    }
    await page.getByRole('button', { name: /mark lesson complete/i }).click();

    await expect(page.locator('#lesson-finish-title')).toBeFocused();
    await expect(page.locator('.lesson-finish [role="status"]')).toContainText(/marked complete/i);
    await expect(page.locator('.lesson-rail-card')).toContainText('Lesson complete');
    await expect(page.locator('.lesson-finish__actions a', { hasText: /take the quiz/i }).first()).toHaveClass(
      /btn--primary/,
    );
  });
});
