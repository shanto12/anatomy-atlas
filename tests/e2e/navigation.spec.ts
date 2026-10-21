import { expect, test } from './fixtures';

import {
  capture,
  expectCleanPage,
  gotoApp,
  organsById,
  systems,
  systemsById,
  waitForProgress,
  watchPage,
} from './helpers';

const cardiovascular = systemsById['cardiovascular'];
const heart = organsById['heart'];

test.describe('navigation: systems and organs', () => {
  test('systems index lists all twelve systems and opens a system page', async ({ page }, testInfo) => {
    const issues = watchPage(page);
    await gotoApp(page, '/systems');
    await expect(page.locator('h1')).toContainText(/twelve systems|body systems/i);

    const systemHrefs = await page
      .locator('main a[href^="/systems/"]')
      .evaluateAll((elements) => [...new Set(elements.map((element) => element.getAttribute('href')))]);
    expect(systemHrefs).toHaveLength(12);
    expect(systemHrefs).toEqual(expect.arrayContaining(systems.map((system) => `/systems/${system.id}`)));

    await page.locator(`main a[href="/systems/cardiovascular"]`).first().click();
    await expect(page).toHaveURL(/\/systems\/cardiovascular$/);
    await expect(page.locator('h1')).toContainText(/cardiovascular/i);
    await expect(page.getByRole('link', { name: /start the lesson/i }).first()).toHaveAttribute(
      'href',
      '/learn/lesson-cardiovascular',
    );
    await expect(page.getByRole('link', { name: /take the quiz/i }).first()).toHaveAttribute('href', '/quiz/cardiovascular');

    await capture(page, testInfo, 'systems-index', { fullPage: true });
    expectCleanPage(issues, 'systems index');
  });

  test('system page → organ page → related organ shows the full organ entry', async ({ page }, testInfo) => {
    expect(cardiovascular, 'cardiovascular content must exist').toBeTruthy();
    expect(heart, 'heart content must exist').toBeTruthy();
    const issues = watchPage(page);

    await gotoApp(page, '/systems/cardiovascular');
    const organHrefs = await page
      .locator('main a[href^="/organs/"]')
      .evaluateAll((elements) => [...new Set(elements.map((element) => element.getAttribute('href')))]);
    expect(organHrefs).toHaveLength(cardiovascular.organs.length);
    expect(organHrefs).toContain('/organs/heart');

    await page.locator('main a[href="/organs/heart"]').first().click();
    await expect(page).toHaveURL(/\/organs\/heart$/);
    await expect(page.locator('h1')).toHaveText('Heart');
    await expect(page.locator('main')).toContainText(heart.tagline);
    await expect(page.getByRole('heading', { name: /what it does/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /common conditions/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /related organs/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /open in 3d/i }).first()).toHaveAttribute('href', '/explore?organ=heart');
    await expect(page.getByRole('button', { name: /save entry/i })).toBeVisible();

    // Related organ links are real, working links.
    const relatedHrefs = await page
      .locator('main a[href^="/organs/"]')
      .evaluateAll((elements) =>
        [...new Set(elements.map((element) => element.getAttribute('href') as string))].filter(
          (href) => href !== '/organs/heart',
        ),
      );
    expect(relatedHrefs.length).toBeGreaterThanOrEqual(2);
    await page.locator(`main a[href="${relatedHrefs[0]}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${relatedHrefs[0]}$`));
    await expect(page.locator('h1')).not.toHaveText('Heart');

    // Bookmarks persist in the documented progress payload.
    await gotoApp(page, '/organs/heart');
    await page.getByRole('button', { name: /save entry/i }).click();
    const progress = await waitForProgress(page, (payload) => payload.bookmarks.includes('heart'));
    expect(progress.bookmarks).toContain('heart');
    await expect(page.getByRole('button', { name: /saved/i })).toBeVisible();

    await capture(page, testInfo, 'organ-heart', { fullPage: true });
    expectCleanPage(issues, 'organ page');
  });

  test('organ page cites sources from the allowlist', async ({ page }) => {
    await gotoApp(page, '/organs/heart');
    const sourceLinks = page.locator('main a[href^="https://"]');
    const hrefs = await sourceLinks.evaluateAll((elements) =>
      [...new Set(elements.map((element) => (element as HTMLAnchorElement).href))],
    );
    expect(hrefs.length).toBeGreaterThanOrEqual(2);
    const allowlist = [
      'medlineplus.gov',
      'nih.gov',
      'clevelandclinic.org',
      'mayoclinic.org',
      'britannica.com',
      'kenhub.com',
      'teachmeanatomy.info',
      'hopkinsmedicine.org',
      'yalemedicine.org',
      'cdc.gov',
      'who.int',
    ];
    for (const href of hrefs) {
      const host = new URL(href).hostname.replace(/^www\./, '');
      expect(
        allowlist.some((domain) => host === domain || host.endsWith(`.${domain}`)),
        `source ${href} is not on the content-spec allowlist`,
      ).toBe(true);
    }
  });

  test('deep links render the right page directly', async ({ page }) => {
    await gotoApp(page, '/organs/heart');
    await expect(page.locator('h1')).toHaveText('Heart');
    await expect(page).toHaveTitle(/heart/i);
    await expect(page.locator('main')).toContainText(/cardiovascular/i);

    await gotoApp(page, '/learn/lesson-cardiovascular');
    await expect(page.locator('h1')).toContainText(new RegExp(cardiovascular.lesson.title.split(' ')[0], 'i'));

    await gotoApp(page, '/systems/respiratory');
    await expect(page.locator('h1')).toContainText(/respiratory/i);

    await gotoApp(page, '/quiz/final');
    await expect(page.locator('h1')).toContainText(/final exam/i);
  });

  test('unknown routes and content ids render the 404 page', async ({ page }) => {
    const issues = watchPage(page);
    const routes = ['/this-page-does-not-exist', '/organs/not-an-organ', '/systems/not-a-system', '/learn/lesson-nope'];
    for (const route of routes) {
      await gotoApp(page, route);
      await expect(page.locator('h1'), `${route} should render the not-found page`).toContainText(/not in the atlas|not been charted/i);
      await expect(page.getByRole('link', { name: /open the (body )?explorer/i }).first()).toBeVisible();
    }
    expectCleanPage(issues, '404 pages');
  });
});
