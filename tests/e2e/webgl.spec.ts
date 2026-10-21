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

    // The scene renders pixels, not just an empty canvas.
    const hasPixels = await canvas.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (!gl) return false;
      const pixels = new Uint8Array(4 * 16 * 16);
      gl.readPixels(0, 0, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return pixels.some((value) => value !== 0);
    });
    expect(hasPixels, '3D canvas should contain rendered pixels').toBe(true);

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

    // The keyboard/touch list still drives the same selection state as the model.
    await page.locator('.explore-list button[data-organ-id="heart"]').click();
    await expect(page.locator('.explore-detail h2')).toHaveText('Heart');
    await expect(page).toHaveURL(/organ=heart/);

    await capture(page, testInfo, 'webgl-explore-heart', { fullPage: false });
    expectCleanPage(issues, 'webgl explore');
  });
});
