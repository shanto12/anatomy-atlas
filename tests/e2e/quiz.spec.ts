import { expect, test, type Page } from './fixtures';

import {
  capture,
  escapeRegExp,
  expectCleanPage,
  expectedQuizScore,
  gotoApp,
  readProgress,
  systems,
  systemsById,
  waitForProgress,
  watchPage,
} from './helpers';

const cardiovascular = systemsById['cardiovascular'];

/** Click the quiz option whose visible text matches exactly. */
async function chooseOption(page: Page, text: string) {
  const options = page.locator('label.quiz-option');
  await expect(options.first()).toBeVisible();
  const count = await options.count();
  for (let index = 0; index < count; index += 1) {
    const optionText = (await options.nth(index).locator('.quiz-option__text').innerText()).trim();
    if (optionText === text) {
      await options.nth(index).click();
      return;
    }
  }
  throw new Error(`Quiz option not found: ${text}`);
}

async function answerAllQuestions(page: Page, pick: (questionIndex: number) => string) {
  const total = cardiovascular.quiz.length;
  for (let index = 0; index < total; index += 1) {
    const question = cardiovascular.quiz[index];
    const expectedAnswer = pick(index);
    // Sanity: the chosen text is one of the four rendered options.
    await expect(page.locator('label.quiz-option')).toHaveCount(4);
    await chooseOption(page, expectedAnswer);
    await page.getByRole('button', { name: /submit answer/i }).click();

    await expect(page.locator('.quiz-feedback')).toBeVisible();
    await expect(page.locator('.quiz-feedback__explanation')).toContainText(question.explanation.slice(0, 40));

    const nextLabel = index === total - 1 ? /see results/i : /next question/i;
    await page.getByRole('button', { name: nextLabel }).click();
  }
}

test.describe('quiz', () => {
  test('hub lists every system quiz and the final exam', async ({ page }, testInfo) => {
    const issues = watchPage(page);
    await gotoApp(page, '/quiz');
    await expect(page.locator('h1')).toContainText(/test yourself|quiz/i);

    const quizHrefs = await page
      .locator('main a[href^="/quiz/"]')
      .evaluateAll((elements) => [...new Set(elements.map((element) => element.getAttribute('href')))]);
    for (const system of systems) {
      expect(quizHrefs).toContain(`/quiz/${system.id}`);
    }
    expect(quizHrefs).toContain('/quiz/final');
    await expect(page.getByRole('link', { name: /final exam/i }).first()).toBeVisible();

    await capture(page, testInfo, 'quiz-hub', { fullPage: true });
    expectCleanPage(issues, 'quiz hub');
  });

  test('perfect run scores 8/8, explains every answer, and saves the best in localStorage', async ({ page }, testInfo) => {
    const issues = watchPage(page);
    await gotoApp(page, '/quiz/cardiovascular');
    await expect(page.locator('h1')).toContainText(/cardiovascular/i);
    await expect(page.getByText(/8 questions/i)).toBeVisible();

    await page.getByRole('button', { name: /start quiz/i }).click();
    await expect(page.getByText('Question 1 of 8', { exact: true }).first()).toBeVisible();

    await answerAllQuestions(page, (index) => {
      const question = cardiovascular.quiz[index];
      return question.options[question.answerIndex];
    });

    await expect(page.locator('.result-summary')).toBeVisible();
    await expect(page.locator('.result-summary__score-line')).toContainText('8 / 8');
    await expect(page.locator('.result-ring__percent')).toHaveText('100%');
    await expect(page.getByRole('heading', { name: /review your answers/i })).toBeVisible();
    await expect(page.locator('.result-review__list')).toContainText(cardiovascular.quiz[0].explanation.slice(0, 40));
    // A first completed attempt is acknowledged as a new best.
    await expect(page.locator('.result-summary__best--new')).toContainText(/new best/i);

    await waitForProgress(
      page,
      (progress) => progress.quizBest?.cardiovascular?.score === 8 && progress.quizBest?.cardiovascular?.total === 8,
    );
    const progress = await readProgress(page);
    expect(progress.quizBest.cardiovascular.score).toBe(8);

    // Reload: the intro reports the saved best score.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/your best so far/i)).toContainText('8 / 8');
    await expect(page.getByText(/your best so far/i)).toContainText('100%');

    await capture(page, testInfo, 'quiz-result', { fullPage: true });
    expectCleanPage(issues, 'quiz perfect run');
  });

  test('a mixed run scores exactly the number of correct answers', async ({ page }) => {
    // Always pick the first option; score is content-derived, not guessed.
    const expected = expectedQuizScore(cardiovascular.quiz, () => 0);

    await gotoApp(page, '/quiz/cardiovascular');
    await page.getByRole('button', { name: /start quiz/i }).click();

    const total = cardiovascular.quiz.length;
    for (let index = 0; index < total; index += 1) {
      const options = page.locator('label.quiz-option');
      await options.first().click();
      await page.getByRole('button', { name: /submit answer/i }).click();
      await expect(page.locator('.quiz-feedback')).toBeVisible();
      await page
        .getByRole('button', { name: index === total - 1 ? /see results/i : /next question/i })
        .click();
    }

    await expect(page.locator('.result-summary__score-line')).toContainText(`${expected} / ${total}`);
    const percent = Math.round((expected / total) * 100);
    await expect(page.locator('.result-ring__percent')).toHaveText(`${percent}%`);
  });

  test('final exam builds a 24-question paper across all systems', async ({ page }) => {
    await gotoApp(page, '/quiz/final');
    await expect(page.locator('h1')).toContainText(/final exam/i);
    await expect(page.locator('main')).toContainText(/24 questions/);
    await page.getByRole('button', { name: /start quiz/i }).click();
    await expect(page.getByText('Question 1 of 24', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('progressbar', { name: /quiz progress/i })).toHaveAttribute('aria-valuenow', '4');

    // Answer the first question correctly using the visible options.
    const questionText = (await page.locator('.question-card__question').innerText()).trim();
    const allQuestions = systems.flatMap((system) => system.quiz);
    const source = allQuestions.find((question) => question.question === questionText);
    expect(source, `final-exam question not found in content: ${questionText}`).toBeTruthy();
    await chooseOption(page, source!.options[source!.answerIndex]);
    await page.getByRole('button', { name: /submit answer/i }).click();
    await expect(page.locator('.quiz-feedback__explanation')).toContainText(source!.explanation.slice(0, 40));
    await page.getByRole('button', { name: /next question/i }).click();
    await expect(page.getByText('Question 2 of 24', { exact: true }).first()).toBeVisible();
  });

  test('quiz page deep-link for a known system and 404 for an unknown one', async ({ page }) => {
    await gotoApp(page, `/quiz/${systems[0].id}`);
    await expect(page.locator('h1')).toContainText(new RegExp(escapeRegExp(systems[0].name), 'i'));

    await gotoApp(page, '/quiz/not-a-system');
    await expect(page.locator('h1')).toContainText(/not in the atlas|not been charted/i);
  });
});
