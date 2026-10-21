import { expect, test } from './fixtures';

import { capture, expectCleanPage, expectNoHorizontalOverflow, gotoApp, systems, watchPage } from './helpers';

test.describe('home', () => {
  test('hero, navigation, stats, system grid and footer render', async ({ page }, testInfo) => {
    const issues = watchPage(page);
    await gotoApp(page, '/');

    await expect(page).toHaveTitle(/Anatomy Atlas/i);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(/human body|every part/i);

    const primaryNav = page.getByRole('navigation', { name: 'Primary' });
    await expect(primaryNav).toBeVisible();
    for (const label of ['Explore', 'Systems', 'Learn', 'Quiz', 'Glossary']) {
      await expect(primaryNav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }

    await expect(page.getByRole('link', { name: /explore the body/i }).first()).toHaveAttribute('href', '/explore');
    await expect(page.getByRole('link', { name: /start a lesson/i }).first()).toHaveAttribute('href', '/learn');
    await expect(page.getByRole('button', { name: 'Search the atlas' }).first()).toBeVisible();

    // Exactly the twelve systems are linked from the home page.
    const systemHrefs = await page
      .locator('main a[href^="/systems/"]')
      .evaluateAll((elements) => [...new Set(elements.map((element) => element.getAttribute('href')))]);
    expect(systemHrefs).toHaveLength(12);
    expect(new Set(systemHrefs).size).toBe(12);
    expect(systemHrefs).toEqual(expect.arrayContaining(systems.map((system) => `/systems/${system.id}`)));

    // Site stats reflect real content.
    const mainText = await page.locator('main').innerText();
    expect(mainText).toContain('12');
    expect(mainText).toMatch(/Body systems/i);
    expect(mainText).toMatch(/Structures/i);
    expect(mainText).toMatch(/Guided lessons/i);

    // SEO basics.
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length ?? 0).toBeGreaterThan(50);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain('anatomy-atlas');

    // Footer: educational disclaimer + source link.
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(/educational content only|not medical advice/i);
    await expect(footer.getByRole('link', { name: /source on github/i })).toHaveAttribute(
      'href',
      /github\.com\/shanto12\/anatomy-atlas/,
    );

    await expectNoHorizontalOverflow(page, 'home at 1280px');
    await capture(page, testInfo, 'home', { fullPage: true });
    expectCleanPage(issues, 'home');
  });

  test('skip link is the first keyboard stop and jumps to main content', async ({ page }) => {
    await gotoApp(page, '/');
    await page.keyboard.press('Tab');
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toContainText(/skip to content/i);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
    await expect(page.locator('#main')).toBeVisible();
  });

  test('opens with a single h1 and no horizontal overflow on each breakpoint width', async ({ page }) => {
    for (const width of [1280, 1024, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoApp(page, '/');
      await expect(page.locator('h1')).toHaveCount(1);
      await expectNoHorizontalOverflow(page, `home at ${width}px`);
    }
  });
});
