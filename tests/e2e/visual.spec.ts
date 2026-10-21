import { test } from './fixtures';

import { capture, gotoApp } from './helpers';

const SHOTS: { route: string; name: string }[] = [
  { route: '/', name: '01-home' },
  { route: '/explore', name: '02-explore' },
  { route: '/systems', name: '03-systems' },
  { route: '/systems/cardiovascular', name: '04-system-cardiovascular' },
  { route: '/organs/heart', name: '05-organ-heart' },
  { route: '/learn', name: '06-learn' },
  { route: '/learn/lesson-cardiovascular', name: '07-lesson-cardiovascular' },
  { route: '/quiz', name: '08-quiz-hub' },
  { route: '/quiz/cardiovascular', name: '09-quiz-cardiovascular' },
  { route: '/glossary', name: '10-glossary' },
];

test.describe('visual snapshots (review artefacts)', () => {
  for (const shot of SHOTS) {
    test(`screenshot: ${shot.name}`, async ({ page }, testInfo) => {
      await gotoApp(page, shot.route);
      await page.waitForTimeout(400);
      await capture(page, testInfo, shot.name, { fullPage: true });
    });
  }
});
