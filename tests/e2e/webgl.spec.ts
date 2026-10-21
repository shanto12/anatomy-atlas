/**
 * Real-WebGL checks. These run in the additive `chromium-webgl` project only:
 * headless software rendering is slow, so the rest of the suite uses the
 * accessible fallback. Keep this file small and deliberate.
 */
import { expect, test } from '@playwright/test';

import { capture, expectCleanPage, gotoApp, watchPage } from './helpers';

test.describe('real 3D viewer (WebGL)', () => {
  test('home hero renders a live WebGL canvas', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const issues = watchPage(page);
    await gotoApp(page, '/');
    const stage = page.locator('.viewer-shell[data-webgl="ready"]').first();
    await expect(stage).toBeVisible({ timeout: 60_000 });
    const canvas = page.locator('.viewer-shell[data-webgl="ready"] canvas').first();
    await expect(canvas).toBeVisible({ timeout: 60_000 });
    const box = await canvas.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(200);
    expect(box?.height ?? 0).toBeGreaterThan(200);

    // Screenshot the live stage as visual evidence. (readPixels is unreliable
    // here: WebGL canvases default to preserveDrawingBuffer: false, so the
    // drawing buffer is cleared after compositing.)
    await capture(page, testInfo, 'webgl-home-hero', { fullPage: false });
    expectCleanPage(issues, 'webgl home');
  });

  test('explore page renders the 3D body and keeps list selection working', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const issues = watchPage(page);
    await gotoApp(page, '/explore');
    const stage = page.locator('.viewer-shell[data-webgl="ready"]').first();
    await expect(stage).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.viewer-shell canvas').first()).toBeVisible({ timeout: 60_000 });

    // The keyboard/touch list still drives the same selection state as the
    // model. force: software WebGL keeps the compositor busy, which trips
    // Playwright's stability check on an otherwise static row.
    await page.locator('.explore-list button[data-organ-id="heart"]').click({ force: true, timeout: 30_000 });
    await expect(page.locator('.explore-detail h2')).toHaveText('Heart');
    await expect(page).toHaveURL(/organ=heart/);

    await capture(page, testInfo, 'webgl-explore-heart', { fullPage: false });
    expectCleanPage(issues, 'webgl explore');
  });
});
