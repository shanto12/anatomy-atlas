#!/usr/bin/env node
/**
 * Verify a deployed Anatomy Atlas build.
 *
 * Usage:
 *   node scripts/verify-live.mjs                         # production URL
 *   node scripts/verify-live.mjs https://example.com     # any deployment
 *   LIVE_URL=http://127.0.0.1:4173 node scripts/verify-live.mjs
 *
 * Checks: HTTP status, document title, one visible h1, primary navigation,
 * key routes (including deep links and a 404), console errors, page errors,
 * failed requests and horizontal overflow. Saves screenshots to
 * test-results/live/ and a JSON summary to test-results/live-report.json.
 *
 * Exits non-zero when any check fails. Requires Playwright (already a dev
 * dependency); no extra packages are installed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const noWebgl = args.includes('--no-webgl');
const baseUrl = (
  args.find((argument) => !argument.startsWith('--')) ||
  process.env.LIVE_URL ||
  'https://anatomy-atlas-b2m.pages.dev'
).replace(/\/+$/, '');
const outDir = path.resolve('test-results', 'live');
mkdirSync(outDir, { recursive: true });

const ROUTES = [
  { path: '/', name: 'home', expect404: false },
  { path: '/explore', name: 'explore', expect404: false },
  { path: '/systems', name: 'systems', expect404: false },
  { path: '/systems/cardiovascular', name: 'system-cardiovascular', expect404: false },
  { path: '/organs/heart', name: 'organ-heart', expect404: false },
  { path: '/explore?organ=heart', name: 'explore-heart-deeplink', expect404: false },
  { path: '/learn', name: 'learn', expect404: false },
  { path: '/learn/lesson-cardiovascular', name: 'lesson-cardiovascular', expect404: false },
  { path: '/quiz', name: 'quiz-hub', expect404: false },
  { path: '/quiz/cardiovascular', name: 'quiz-cardiovascular', expect404: false },
  { path: '/quiz/final', name: 'quiz-final', expect404: false },
  { path: '/glossary', name: 'glossary', expect404: false },
  { path: '/about', name: 'about', expect404: false },
  { path: '/this-page-does-not-exist', name: 'not-found', expect404: true },
];

const NAV_LABELS = ['Explore', 'Systems', 'Learn', 'Quiz', 'Glossary'];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const results = [];

function fail(result, message) {
  result.pass = false;
  result.problems.push(message);
}

for (const route of ROUTES) {
  const result = {
    route: route.path,
    name: route.name,
    status: 0,
    title: '',
    h1: '',
    nav: [],
    screenshots: [],
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    overflow: { scrollWidth: 0, clientWidth: 0 },
    pass: true,
    problems: [],
    warnings: [],
  };
  const page = await context.newPage();
  if (noWebgl) {
    // Software WebGL can make headless full-page screenshots time out. The
    // production fallback is a supported path, so --no-webgl gives a fast,
    // deterministic functional check; run without it to also exercise 3D.
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (typeof type === 'string' && /webgl/i.test(type)) return null;
        return original.call(this, type, ...rest);
      };
    });
  }
  page.on('console', (message) => {
    if (message.type() === 'error') result.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => result.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? 'unknown';
    if (/net::ERR_ABORTED/.test(reason) && request.resourceType() !== 'document') return;
    result.failedRequests.push(`${request.method()} ${request.url()} — ${reason}`);
  });

  try {
    const response = await page.goto(`${baseUrl}${route.path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    result.status = response?.status() ?? 0;
    await page.waitForTimeout(800);
    result.title = await page.title();
    const h1 = page.locator('main h1, h1').first();
    result.h1 = ((await h1.textContent({ timeout: 15_000 })) ?? '').replace(/\s+/g, ' ').trim();
    result.nav = await page
      .locator('nav[aria-label="Primary"] a, nav a')
      .evaluateAll((elements) => [...new Set(elements.map((element) => (element.textContent ?? '').trim()))]);
    result.overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const screenshot = path.join(outDir, `${route.name}.png`);
    try {
      await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled', timeout: 20_000 });
      result.screenshots.push(screenshot);
    } catch (error) {
      // Very tall pages with a live WebGL canvas can defeat the GPU
      // screenshot path under software rendering. Treat this as a warning:
      // it must not mask functional checks.
      result.warnings.push(`screenshot unavailable: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
    }
  } catch (error) {
    fail(result, `navigation failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (result.status !== 200) fail(result, `expected HTTP 200 for ${route.path}, got ${result.status}`);
  if (!result.title) fail(result, 'document title is empty');
  else if (!/anatomy atlas/i.test(result.title)) fail(result, `title does not mention Anatomy Atlas: "${result.title}"`);
  if (!result.h1) fail(result, 'no visible h1');

  if (route.expect404) {
    const body = (await page.locator('main').innerText().catch(() => '')) || '';
    if (!/not in the atlas|not found|404/i.test(body)) fail(result, '404 route did not render a not-found page');
  } else {
    for (const label of NAV_LABELS) {
      if (!result.nav.includes(label)) fail(result, `primary navigation missing "${label}"`);
    }
  }
  if (result.overflow.scrollWidth > result.overflow.clientWidth + 1) {
    fail(result, `horizontal overflow: ${result.overflow.scrollWidth}px > ${result.overflow.clientWidth}px`);
  }
  if (result.consoleErrors.length) fail(result, `console errors: ${result.consoleErrors.slice(0, 3).join(' | ')}`);
  if (result.pageErrors.length) fail(result, `page errors: ${result.pageErrors.slice(0, 3).join(' | ')}`);
  if (result.failedRequests.length) {
    fail(result, `failed requests: ${result.failedRequests.slice(0, 3).join(' | ')}`);
  }

  // Resource weight on the home page only (representative initial load).
  if (route.path === '/') {
    result.resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      const js = entries.filter((entry) => entry.name.endsWith('.js'));
      const transfer = js.reduce((total, entry) => total + (entry.transferSize || 0), 0);
      return {
        resourceCount: entries.length,
        jsCount: js.length,
        jsTransferBytes: transfer,
        jsTransferKb: Math.round(transfer / 1024),
      };
    });
  }

  results.push(result);
  await page.close();
}

await Promise.race([
  browser.close(),
  new Promise((resolve) => setTimeout(resolve, 5_000)),
]);

const failures = results.filter((result) => !result.pass);
const report = {
  baseUrl,
  checkedAt: new Date().toISOString(),
  total: results.length,
  passed: results.length - failures.length,
  failed: failures.length,
  results,
};
writeFileSync(path.resolve('test-results', 'live-report.json'), JSON.stringify(report, null, 2));

const pad = (value, width) => String(value).padEnd(width).slice(0, width);
console.log(`\nAnatomy Atlas live check — ${baseUrl}`);
console.log(`${pad('ROUTE', 34)} ${pad('STATUS', 7)} ${pad('H1', 34)} RESULT`);
for (const result of results) {
  console.log(
    `${pad(result.route, 34)} ${pad(result.status, 7)} ${pad(result.h1 || '(none)', 34)} ${
      result.pass ? 'PASS' : `FAIL — ${result.problems.join('; ')}`
    }`,
  );
}
if (results[0]?.resources) {
  console.log(
    `\nHome initial JS: ${results[0].resources.jsTransferKb} KB across ${results[0].resources.jsCount} files ` +
      `(${results[0].resources.resourceCount} resources total)`,
  );
}
console.log(`\n${report.passed}/${report.total} routes passed. Report: test-results/live-report.json`);
process.exit(failures.length > 0 ? 1 : 0);
