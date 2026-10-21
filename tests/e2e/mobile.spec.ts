import { expect, test } from './fixtures';

import {
  ALL_ROUTES,
  capture,
  expectCleanPage,
  expectNoHorizontalOverflow,
  gotoApp,
  watchPage,
} from './helpers';

test.describe('mobile navigation', () => {
  test('menu opens, navigates, and closes (Pixel 7)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-pixel-7', 'mobile-only navigation check');
    const issues = watchPage(page);
    await gotoApp(page, '/');

    const menuButton = page.getByRole('button', { name: /open menu/i });
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await menuButton.click();
    const mobileNav = page.getByRole('navigation', { name: 'Mobile' });
    await expect(mobileNav).toBeVisible();
    await expect(page.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true');
    for (const label of ['Explore', 'Systems', 'Learn', 'Quiz', 'Glossary', 'About']) {
      await expect(mobileNav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }

    await capture(page, testInfo, 'mobile-menu-open', { fullPage: false });

    await mobileNav.getByRole('link', { name: 'Explore', exact: true }).click();
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeHidden();
    await expectNoHorizontalOverflow(page, 'explore mobile');
    expectCleanPage(issues, 'mobile navigation');
  });

  test('touch organ selection works on the organ page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-pixel-7', 'touch-specific check');
    await gotoApp(page, '/organs/heart');
    await expect(page.locator('h1')).toHaveText('Heart');
    const bookmark = page.getByRole('button', { name: /save entry/i });
    await expect(bookmark).toBeVisible();
    await bookmark.tap();
    await expect(page.getByRole('button', { name: /saved/i })).toBeVisible();
  });
});

test.describe('no horizontal overflow at 360px', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('every key route fits the narrowest supported viewport', async ({ page }, testInfo) => {
    const routeNames: [string, string][] = [
      ['/', 'home'],
      ['/explore', 'explore'],
      ['/systems', 'systems'],
      ['/systems/cardiovascular', 'system'],
      ['/organs/heart', 'organ'],
      ['/learn', 'learn'],
      ['/learn/lesson-cardiovascular', 'lesson'],
      ['/quiz', 'quiz-hub'],
      ['/quiz/cardiovascular', 'quiz'],
      ['/glossary', 'glossary'],
    ];
    const failures: string[] = [];
    for (const [route, name] of routeNames) {
      await gotoApp(page, route);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      if (metrics.scrollWidth > metrics.clientWidth + 1) {
        failures.push(`${name} (${route}): ${metrics.scrollWidth}px > ${metrics.clientWidth}px`);
      }
      if (name === 'home' || name === 'organ') {
        await capture(page, testInfo, `360-${name}`, { fullPage: true });
      }
    }
    expect(failures).toEqual([]);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('respects prefers-reduced-motion and stays functional', async ({ page }, testInfo) => {
    await gotoApp(page, '/');
    const matches = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    expect(matches).toBe(true);

    // No infinite decorative animation should run when the user asks for less motion.
    const infiniteAnimations = await page.evaluate(() => {
      const offenders: string[] = [];
      for (const element of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
        const style = getComputedStyle(element);
        if (style.animationName !== 'none' && style.animationIterationCount.includes('infinite')) {
          offenders.push(`${element.tagName.toLowerCase()}.${element.className}`);
        }
      }
      return offenders.slice(0, 10);
    });
    expect(infiniteAnimations, 'infinite CSS animations under prefers-reduced-motion').toEqual([]);

    // The page still works: a primary journey is reachable.
    await page.getByRole('link', { name: /explore the body/i }).first().click();
    await expect(page).toHaveURL(/\/explore$/);
    await expectNoHorizontalOverflow(page, 'reduced-motion explore');

    await capture(page, testInfo, 'reduced-motion-home', { fullPage: false });
  });

  test('animations are disabled across primary routes', async ({ page }) => {
    const routes = ['/systems', '/organs/heart', '/learn'];
    const offenders: string[] = [];
    for (const route of routes) {
      await gotoApp(page, route);
      const found = await page.evaluate(() => {
        const list: string[] = [];
        for (const element of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
          const style = getComputedStyle(element);
          if (style.animationName !== 'none' && style.animationIterationCount.includes('infinite')) {
            list.push(element.className);
          }
        }
        return list.slice(0, 5);
      });
      for (const entry of found) offenders.push(`${route}: ${entry}`);
    }
    expect(offenders).toEqual([]);
  });
});

test.describe('mobile smoke across key routes', () => {
  test('key routes render on mobile without console errors', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-pixel-7', 'mobile-only sweep');
    const issues = watchPage(page);
    for (const route of ALL_ROUTES) {
      await gotoApp(page, route);
      await expect(page.locator('main h1').first()).toBeVisible();
    }
    expectCleanPage(issues, 'mobile route sweep');
  });
});
