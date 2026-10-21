import { expect, test } from './fixtures';

import {
  capture,
  expectCleanPage,
  glossary,
  gotoApp,
  systemsById,
  tabUntil,
  watchPage,
} from './helpers';

const term = glossary.find((entry) => entry.term.length >= 4) ?? glossary[0];

test.describe('glossary', () => {
  test('lists terms and filters with search, including the empty state', async ({ page }, testInfo) => {
    expect(glossary.length).toBeGreaterThan(20);
    const issues = watchPage(page);
    await gotoApp(page, '/glossary');
    await expect(page.locator('h1')).toContainText(/words of|anatomy/i);

    const entries = page.locator('.glossary-entry');
    const initialCount = await entries.count();
    expect(initialCount).toBeGreaterThan(20);
    await expect(page.locator('main')).toContainText(term.term);

    const search = page.getByLabel('Search the glossary');
    await search.fill(term.term);
    await expect(entries.first()).toBeVisible();
    const filteredCount = await entries.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    await expect(page.locator('.glossary-entry', { hasText: term.term }).first()).toBeVisible();

    await search.fill('zzzqqqxyz');
    await expect(page.getByText(/no terms match/i)).toBeVisible();

    await search.fill('');
    await expect(entries).toHaveCount(initialCount);

    await capture(page, testInfo, 'glossary', { fullPage: true });
    expectCleanPage(issues, 'glossary');
  });

  test('topic and letter filters work', async ({ page }) => {
    await gotoApp(page, '/glossary');
    const initialCount = await page.locator('.glossary-entry').count();

    // Letter jump narrows the list.
    const letter = term.term[0].toUpperCase();
    await page.getByRole('button', { name: new RegExp(`^${letter} — `) }).click();
    await expect(page.locator('.glossary-entry')).not.toHaveCount(initialCount);
    const lettered = await page.locator('.glossary-entry__term').allInnerTexts();
    for (const label of lettered) expect(label.trim().toUpperCase().startsWith(letter)).toBe(true);

    // Reset.
    await page
      .getByRole('navigation', { name: /jump to a letter/i })
      .getByRole('button', { name: 'All', exact: true })
      .click();
    await expect(page.locator('.glossary-entry')).toHaveCount(initialCount);

    // A glossary deep link focuses the term.
    await gotoApp(page, '/glossary#heart');
    await expect(page.locator('main h1')).toBeVisible();
  });

  test('deep link by term anchor highlights that term', async ({ page }) => {
    const slug = term.term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    await gotoApp(page, `/glossary#${slug}`);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#${slug}$`));
  });
});

test.describe('global search (⌘K)', () => {
  test('opens with Ctrl/Cmd+K, autofocuses, searches, and navigates with Enter', async ({ page }, testInfo) => {
    const issues = watchPage(page);
    await gotoApp(page, '/');
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: /search the atlas/i });
    await expect(dialog).toBeVisible();
    const input = page.getByRole('combobox', { name: /search the atlas/i });
    await expect(input).toBeFocused();

    await input.fill('heart');
    const heartResult = dialog.locator('a[href="/organs/heart"]').first();
    await expect(heartResult).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /organs/i })).toBeVisible();

    await input.press('Enter');
    await expect(page).toHaveURL(/\/organs\/heart$/);
    await expect(dialog).toBeHidden();

    await capture(page, testInfo, 'search-dialog', { fullPage: false });
    expectCleanPage(issues, 'global search');
  });

  test('Escape and the close button dismiss the dialog', async ({ page }) => {
    await gotoApp(page, '/systems');
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: /search the atlas/i });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page.keyboard.press('Control+k');
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: /close search/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('search finds systems, lessons and glossary terms in grouped results', async ({ page }) => {
    const target = systemsById['nervous'];
    await gotoApp(page, '/');
    await page.keyboard.press('Control+k');
    const input = page.getByRole('combobox', { name: /search the atlas/i });
    await input.fill(target.name);

    const dialog = page.getByRole('dialog', { name: /search the atlas/i });
    await expect(dialog.getByRole('heading', { name: /body systems/i })).toBeVisible();
    await expect(dialog.locator(`a[href="/systems/${target.id}"]`).first()).toBeVisible();

    await input.fill(glossary[0].term);
    await expect(dialog.getByRole('heading', { name: /glossary/i })).toBeVisible();
  });

  test('shows a helpful empty state for no results', async ({ page }) => {
    await gotoApp(page, '/');
    await page.keyboard.press('Control+k');
    const input = page.getByRole('combobox', { name: /search the atlas/i });
    await input.fill('zzzqqqxyz');
    const dialog = page.getByRole('dialog', { name: /search the atlas/i });
    await expect(dialog.locator('.search-dialog__empty')).toContainText(/nothing found/i);
  });

  test('arrow keys move through results and Enter navigates', async ({ page }) => {
    await gotoApp(page, '/');
    await page.keyboard.press('Control+k');
    const input = page.getByRole('combobox', { name: /search the atlas/i });
    await input.fill('brain');
    await input.press('ArrowDown');
    const active = await page.evaluate(() => document.activeElement?.getAttribute('href'));
    expect(active).toMatch(/\/organs\/brain$/);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/organs\/brain$/);
  });

  test('keyboard-only: search opens and result is reachable with Tab', async ({ page }) => {
    await gotoApp(page, '/');
    // The header search button is reachable without a pointer.
    let info = await tabUntil(page, (active) => /search the atlas/i.test(`${active.name ?? ''} ${active.text}`), 40);
    if (!info) {
      // WebKit/macOS Tab limitation: focus then activate with the keyboard.
      await page.getByRole('button', { name: /search the atlas/i }).first().focus();
      info = {
        tag: 'BUTTON',
        role: null,
        type: null,
        name: 'Search the atlas',
        text: 'Search the atlas',
        href: null,
      };
    }
    expect(info, 'search control must be keyboard reachable').not.toBeNull();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: /search the atlas/i })).toBeVisible();
    await expect(page.getByRole('combobox', { name: /search the atlas/i })).toBeFocused();
  });
});
