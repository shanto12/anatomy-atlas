import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Shared e2e helpers: content fixtures, console/network watchers, accessibility
 * scans, screenshots, overflow checks and keyboard helpers.
 */

export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, 'src', 'data');
export const SYSTEMS_DIR = path.join(DATA_DIR, 'systems');
export const RESULTS_DIR = path.join(ROOT, 'test-results');
export const STORAGE_KEY = 'anatomy-atlas:progress:v1';

/* ------------------------------------------------------------------ */
/* Content fixtures (read from disk so tests follow the real content)  */
/* ------------------------------------------------------------------ */

export interface QuizQuestionFixture {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: string;
}

export interface OrganFixture {
  id: string;
  systemId: string;
  name: string;
  tagline: string;
  region: string;
  relatedOrgans: string[];
}

export interface SystemFixture {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  color: string;
  organs: OrganFixture[];
  lesson: { id: string; title: string; subtitle: string; steps: { title: string; organId?: string }[] };
  quiz: QuizQuestionFixture[];
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

export const systems: SystemFixture[] = existsSync(SYSTEMS_DIR)
  ? readdirSync(SYSTEMS_DIR)
      .filter((file) => file.endsWith('.json'))
      .sort()
      .map((file) => readJson<SystemFixture>(path.join(SYSTEMS_DIR, file)))
  : [];

export const systemsById: Record<string, SystemFixture> = Object.fromEntries(
  systems.map((system) => [system.id, system]),
);
export const organs: OrganFixture[] = systems.flatMap((system) => system.organs);
export const organsById: Record<string, OrganFixture> = Object.fromEntries(organs.map((organ) => [organ.id, organ]));

export const glossary = existsSync(path.join(DATA_DIR, 'glossary.json'))
  ? readJson<{ term: string; definition: string; category: string }[]>(path.join(DATA_DIR, 'glossary.json'))
  : [];

export const ALL_ROUTES = [
  '/',
  '/explore',
  '/systems',
  '/systems/cardiovascular',
  '/organs/heart',
  '/learn',
  '/learn/lesson-cardiovascular',
  '/quiz',
  '/quiz/cardiovascular',
  '/glossary',
  '/about',
];

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

/** Navigate and wait for the page shell + heading; fails on HTTP >= 400. */
export async function gotoApp(page: Page, route: string) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 0, `HTTP status for ${route}`).toBeLessThan(400);
  await expect(page.locator('main h1').first(), `main h1 must be visible on ${route}`).toBeVisible();
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready ?? Promise.resolve()).catch(() => undefined);
  return response;
}

/* ------------------------------------------------------------------ */
/* Console errors and failed requests                                  */
/* ------------------------------------------------------------------ */

export interface PageIssues {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  serverErrors: string[];
}

/** Attach listeners that record console errors, page errors, and failed requests. */
export function watchPage(page: Page): PageIssues {
  const issues: PageIssues = { consoleErrors: [], pageErrors: [], failedRequests: [], serverErrors: [] };
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // A 404 for a missing favicon is reported separately below; keep it visible.
    issues.consoleErrors.push(text);
  });
  page.on('pageerror', (error) => {
    issues.pageErrors.push(error.message);
  });
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? 'unknown';
    // Aborted lazy imports when a test navigates away are not defects.
    if (/net::ERR_ABORTED/.test(reason) && request.resourceType() !== 'document') return;
    issues.failedRequests.push(`${request.method()} ${request.url()} — ${reason}`);
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (!url.startsWith('http://127.0.0.1') && !url.startsWith('http://localhost')) return;
    issues.serverErrors.push(`${response.status()} ${response.request().method()} ${url}`);
  });
  return issues;
}

function sameOriginOnly(url: string): boolean {
  return url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost');
}

export function expectCleanPage(issues: PageIssues, label: string) {
  expect(issues.pageErrors, `${label}: uncaught page errors`).toEqual([]);
  expect(issues.consoleErrors, `${label}: console errors`).toEqual([]);
  expect(issues.failedRequests, `${label}: failed requests`).toEqual([]);
  expect(issues.serverErrors.filter((entry) => sameOriginOnly(entry.split(' ')[2] ?? '')), `${label}: HTTP errors`).toEqual(
    [],
  );
}

/* ------------------------------------------------------------------ */
/* Screenshots and reports                                             */
/* ------------------------------------------------------------------ */

function safeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export async function capture(page: Page, testInfo: TestInfo, name: string, options: { fullPage?: boolean } = {}) {
  const dir = path.join(RESULTS_DIR, 'screenshots', testInfo.project.name);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${safeName(name)}.png`);
  const buffer = await page.screenshot({ path: file, fullPage: options.fullPage ?? false, animations: 'disabled' });
  await testInfo.attach(`screenshot:${name}`, { body: buffer, contentType: 'image/png' });
  return file;
}

export function writeReport(name: string, data: unknown) {
  const dir = path.join(RESULTS_DIR, 'reports');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

/* ------------------------------------------------------------------ */
/* Accessibility                                                       */
/* ------------------------------------------------------------------ */

export interface A11ySummary {
  route: string;
  serious: { id: string; impact: string | null; help: string; nodes: string[] }[];
  all: { id: string; impact: string | null; help: string; nodes: number; sentinel: boolean }[];
}

/** Run axe, write a JSON report, and fail on any serious/critical violation. */
export async function expectAccessible(
  page: Page,
  testInfo: TestInfo,
  label: string,
  route?: string,
): Promise<A11ySummary> {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? null,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));
  const serious = violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
  const summary: A11ySummary = {
    route: route ?? page.url(),
    serious,
    all: violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      help: violation.help,
      nodes: violation.nodes.length,
      sentinel: violation.id === 'aria-allowed-role',
    })),
  };
  const dir = path.join(RESULTS_DIR, 'a11y', safeName(testInfo.project.name));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${safeName(label)}.json`), JSON.stringify({ ...summary, violations }, null, 2));
  await testInfo.attach(`axe:${label}`, { body: JSON.stringify(summary, null, 2), contentType: 'application/json' });
  if (serious.length > 0) {
    await capture(page, testInfo, `a11y-${label}`, { fullPage: true });
  }
  expect(
    serious.map((violation) => `${violation.id} (${violation.impact}): ${violation.help} — ${violation.nodes.join(', ')}`),
    `${label}: serious/critical accessibility violations`,
  ).toEqual([]);
  return summary;
}

/* ------------------------------------------------------------------ */
/* Layout, keyboard, and other assertions                              */
/* ------------------------------------------------------------------ */

export async function expectNoHorizontalOverflow(page: Page, label: string, max = 1) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body?.scrollWidth ?? 0,
  }));
  expect(
    metrics.scrollWidth,
    `${label}: horizontal overflow (document ${metrics.scrollWidth}px > viewport ${metrics.clientWidth}px)`,
  ).toBeLessThanOrEqual(metrics.clientWidth + max);
  expect(
    metrics.bodyScrollWidth,
    `${label}: horizontal overflow (body ${metrics.bodyScrollWidth}px > viewport ${metrics.clientWidth}px)`,
  ).toBeLessThanOrEqual(metrics.clientWidth + max);
}

export interface ActiveInfo {
  tag: string;
  role: string | null;
  type: string | null;
  name: string | null;
  text: string;
  href: string | null;
}

export async function activeInfo(page: Page): Promise<ActiveInfo> {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element) return { tag: 'NONE', role: null, type: null, name: null, text: '', href: null };
    return {
      tag: element.tagName,
      role: element.getAttribute('role'),
      type: element.getAttribute('type'),
      name: element.getAttribute('aria-label') ?? element.getAttribute('aria-labelledby'),
      text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
      href: element instanceof HTMLAnchorElement ? element.getAttribute('href') : null,
    };
  });
}

/** Press Tab until `predicate` matches the active element. Returns the match or null. */
export async function tabUntil(
  page: Page,
  predicate: (info: ActiveInfo) => boolean,
  maxTabs = 120,
): Promise<ActiveInfo | null> {
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press('Tab');
    const info = await activeInfo(page);
    if (predicate(info)) return info;
  }
  return null;
}

export async function expectVisibleFocus(page: Page) {
  const style = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element) return null;
    const computed = getComputedStyle(element);
    return {
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
      boxShadow: computed.boxShadow,
    };
  });
  expect(style, 'focused element must exist').not.toBeNull();
  expect(
    style!.outlineStyle !== 'none' || style!.boxShadow !== 'none',
    `focused element has no visible focus indicator: ${JSON.stringify(style)}`,
  ).toBe(true);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function expectedQuizScore(quiz: QuizQuestionFixture[], pick: (question: QuizQuestionFixture) => number): number {
  return quiz.filter((question) => pick(question) === question.answerIndex).length;
}

export function parseProgress(storageValue: string | null): any {
  if (!storageValue) return null;
  try {
    return JSON.parse(storageValue);
  } catch {
    return null;
  }
}

export async function readProgress(page: Page): Promise<any> {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  return parseProgress(raw);
}

export async function waitForProgress(page: Page, predicate: (progress: any) => boolean, timeout = 5_000) {
  const started = Date.now();
  let last: any = null;
  while (Date.now() - started < timeout) {
    last = await readProgress(page);
    if (last && predicate(last)) return last;
    await page.waitForTimeout(100);
  }
  expect(last, 'progress payload in localStorage').not.toBeNull();
  expect(predicate(last), `progress predicate failed; payload: ${JSON.stringify(last)}`).toBe(true);
  return last;
}
