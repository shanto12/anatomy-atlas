import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { expect, test } from './fixtures';

import {
  ALL_ROUTES,
  ROOT,
  capture,
  expectCleanPage,
  gotoApp,
  watchPage,
  writeReport,
} from './helpers';

test.describe('runtime quality', () => {
  test('key routes produce no console errors, page errors or failed requests', async ({ page }, testInfo) => {
    const failures: string[] = [];
    for (const route of ALL_ROUTES) {
      const issues = watchPage(page);
      await gotoApp(page, route);
      expectCleanPage(issues, `${testInfo.project.name} ${route}`);
      if (issues.consoleErrors.length || issues.pageErrors.length || issues.failedRequests.length) {
        failures.push(route);
      }
      // Detach listeners for the next route by reloading context state is not
      // needed: each route accumulates into its own issue object.
      page.removeAllListeners('console');
      page.removeAllListeners('pageerror');
      page.removeAllListeners('requestfailed');
      page.removeAllListeners('response');
    }
    expect(failures).toEqual([]);
  });

  test('WebGL-unavailable devices get a usable text fallback, not a blank stage', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'WebGL emulation is Chromium-specific');
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        return (original as any).call(this, type, ...args);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    const issues = watchPage(page);
    await gotoApp(page, '/explore');
    await expect(page.locator('[data-webgl="unavailable"]')).toBeVisible();
    await expect(page.locator('.viewer-fallback')).toContainText(/webgl/i);
    await expect(page.locator('main h1')).toBeVisible();
    // The organ list remains usable without WebGL.
    await expect(page.locator('main a[href^="/organs/"], .viewer-fallback__organ').first()).toBeVisible();
    expect(issues.pageErrors, 'WebGL fallback must not throw uncaught errors').toEqual([]);
    await capture(page, testInfo, 'webgl-fallback', { fullPage: false });
  });
});

test.describe('performance and bundle budgets', () => {
  test('initial JavaScript stays within the documented budget', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'bundle budget measured once');
    const distDir = path.join(ROOT, 'dist');
    expect(existsSync(distDir), 'dist/ is missing — run `npm run build` first').toBe(true);
    const assetsDir = path.join(distDir, 'assets');
    const assets = readdirSync(assetsDir);

    const sizeOf = (file: string) => ({
      raw: readFileSync(path.join(assetsDir, file)).length,
      gzip: gzipSync(readFileSync(path.join(assetsDir, file))).length,
    });
    const js = assets.filter((file) => file.endsWith('.js'));
    const css = assets.filter((file) => file.endsWith('.css'));

    const initial = js.filter((file) => /^index-/.test(file) || /^react-/.test(file));
    const three = js.filter((file) => /^three-/.test(file));
    expect(initial.length, 'entry/react chunks not found').toBeGreaterThan(0);
    expect(three.length, 'three.js chunk not found').toBeGreaterThan(0);

    const sum = (files: string[]) =>
      files.reduce((total, file) => {
        const { gzip } = sizeOf(file);
        return total + gzip;
      }, 0);
    const initialGzip = sum(initial);
    const threeGzip = sum(three);
    const cssGzip = sum(css);

    const report = {
      project: testInfo.project.name,
      initial: { files: initial, gzip: initialGzip, budget: 450 * 1024 },
      three: { files: three, gzip: threeGzip, budget: 400 * 1024, excludedFromInitial: true },
      css: { files: css, gzip: cssGzip, budget: 60 * 1024 },
      allJs: js.map((file) => ({ file, ...sizeOf(file) })),
    };
    writeReport('bundle-report.json', report);

    expect(initialGzip, `initial JS (excl. 3D chunk) is ${Math.round(initialGzip / 1024)} KB gzip`).toBeLessThan(
      450 * 1024,
    );
    expect(threeGzip, `three chunk is ${Math.round(threeGzip / 1024)} KB gzip`).toBeLessThan(400 * 1024);
    expect(cssGzip, `CSS is ${Math.round(cssGzip / 1024)} KB gzip`).toBeLessThan(60 * 1024);
  });

  test('home page loads within the navigation and paint budget', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'performance measured once');
    await page.addInitScript(() => {
      (window as any).__qaPerf = { lcp: 0, cls: 0 };
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            (window as any).__qaPerf.lcp = entry.startTime;
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) (window as any).__qaPerf.cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      } catch {
        /* observers unavailable in this engine */
      }
    });

    await gotoApp(page, '/');
    await page.waitForTimeout(1_200);
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const paint = performance.getEntriesByType('paint');
      return {
        domContentLoaded: navigation?.domContentLoadedEventEnd ?? 0,
        load: navigation?.loadEventEnd ?? 0,
        lcp: (window as any).__qaPerf?.lcp ?? 0,
        cls: (window as any).__qaPerf?.cls ?? 0,
        fcp: paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? 0,
      };
    });
    writeReport('perf-report.json', metrics);

    expect(metrics.domContentLoaded, `DOMContentLoaded took ${Math.round(metrics.domContentLoaded)}ms`).toBeLessThan(
      4_000,
    );
    expect(metrics.fcp, `FCP took ${Math.round(metrics.fcp)}ms`).toBeLessThan(3_000);
    expect(metrics.lcp, `LCP took ${Math.round(metrics.lcp)}ms`).toBeLessThan(4_000);
    expect(metrics.cls, `CLS was ${metrics.cls.toFixed(3)}`).toBeLessThan(0.15);
  });
});
