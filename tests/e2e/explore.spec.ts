import { expect, test } from './fixtures';

import { capture, expectCleanPage, gotoApp, organsById, systemsById, watchPage } from './helpers';

const heart = organsById['heart'];

test.describe('explore', () => {
  test('renders the stage with an accessible fallback and the full organ browser', async ({ page }, testInfo) => {
    const issues = watchPage(page);
    await gotoApp(page, '/explore');
    await expect(page.locator('h1')).toContainText(/every part of you|explorer/i);

    const viewer = page.locator('.viewer-shell').first();
    await expect(viewer).toBeVisible();
    // Default e2e fixture blocks WebGL: the documented fallback must show.
    await expect(viewer).toHaveAttribute('data-webgl', 'unavailable');
    await expect(page.locator('.viewer-fallback')).toBeVisible();
    await expect(page.locator('.viewer-fallback')).toContainText(/webgl/i);

    // The organ browser is always available, independent of the 3D stage.
    const organRows = page.locator('.explore-list button[data-organ-id]');
    const rowCount = await organRows.count();
    expect(rowCount, 'every structure must be listed').toBeGreaterThanOrEqual(60);
    const listedIds = await organRows.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-organ-id')),
    );
    expect(listedIds).toContain('heart');
    expect(new Set(listedIds).size).toBe(listedIds.length);

    await capture(page, testInfo, 'explore-fallback', { fullPage: true });
    expectCleanPage(issues, 'explore');
  });

  test('selecting an organ from the list updates the detail panel and URL', async ({ page }) => {
    await gotoApp(page, '/explore');
    const heartRow = page.locator('.explore-list button[data-organ-id="heart"]');
    await expect(heartRow).toBeVisible();
    await heartRow.click();

    const detail = page.locator('.explore-detail');
    await expect(detail).toBeVisible();
    await expect(detail.getByRole('heading', { level: 2 })).toHaveText('Heart');
    await expect(detail).toContainText(heart.tagline);
    await expect(detail.getByRole('link', { name: /open full entry/i })).toHaveAttribute('href', '/organs/heart');
    await expect(page).toHaveURL(/\/explore\?.*organ=heart/);
    await expect(heartRow).toHaveAttribute('aria-pressed', 'true');

    await detail.getByRole('button', { name: /clear selection/i }).click();
    await expect(page.locator('.explore-detail')).toBeHidden();
    await expect(page).not.toHaveURL(/organ=heart/);
  });

  test('deep link ?organ=heart opens with the heart selected', async ({ page }, testInfo) => {
    await gotoApp(page, '/explore?organ=heart');
    await expect(page.locator('.explore-detail')).toBeVisible();
    await expect(page.locator('.explore-detail h2')).toHaveText('Heart');
    await expect(page.locator('.explore-list button[data-organ-id="heart"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('main')).toContainText(heart.tagline);
    await capture(page, testInfo, 'explore-heart-deeplink', { fullPage: true });
  });

  test('system filter and organ search narrow the browser', async ({ page }) => {
    await gotoApp(page, '/explore');

    // Filter by system.
    const cardioShortName = systemsById['cardiovascular'].shortName;
    const cardioChip = page.getByRole('button', { name: new RegExp(`^${cardioShortName}`) });
    await cardioChip.click();
    await expect(cardioChip).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/system=cardiovascular/);
    await expect(page.locator('.explore-list button[data-organ-id="heart"]')).toBeVisible();
    await expect(page.locator('.explore-list button[data-organ-id="femur"]')).toHaveCount(0);

    // Free-text organ search.
    const search = page.getByLabel('Search organs');
    await search.fill('heart');
    await expect(page.locator('.explore-list button[data-organ-id="heart"]')).toBeVisible();
    const countText = await page.locator('.explore-list-count').innerText();
    expect(countText).toMatch(/^[1-9]\d* structure/);

    await search.fill('zzzqqqxyz');
    await expect(page.getByText(/no structure matches/i)).toBeVisible();

    // Reset to all systems.
    await page.locator('.sys-chip--all').click();
    await expect(page).not.toHaveURL(/system=/);
  });
});
