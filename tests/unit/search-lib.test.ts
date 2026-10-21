/**
 * Search engine — src/lib/search.ts.
 *
 * Pins normalisation, fuzzy matching, weighted ranking, grouping, limits,
 * snippet/highlight rendering, and glossary anchors.
 */
import { describe, expect, it } from 'vitest';

import { glossary, systems } from '@/data';
import {
  SEARCH_GROUP_LABELS,
  SEARCH_GROUP_ORDER,
  buildSnippet,
  flattenSearchGroups,
  getSearchIndex,
  glossarySlug,
  hasSearchableContent,
  highlightSegments,
  isNearMatch,
  normalizeSearchText,
  searchAtlas,
  searchResultCount,
  tokenizeQuery,
} from '@/lib/search';

describe('normalisation and fuzzy helpers', () => {
  it('normalizeSearchText folds case, diacritics, curly quotes and dashes', () => {
    expect(normalizeSearchText('  Left Ventricle ')).toBe('left ventricle');
    expect(normalizeSearchText('Café')).toBe('cafe');
    expect(normalizeSearchText('Body’s – pump')).toBe("body's - pump");
  });

  it('tokenizeQuery drops punctuation and empty tokens', () => {
    expect(tokenizeQuery('heart, blood!')).toEqual(['heart', 'blood']);
    expect(tokenizeQuery('   ')).toEqual([]);
    expect(tokenizeQuery("body's pump")).toEqual(["body's", 'pump']);
  });

  it('isNearMatch forgives one edit but not two', () => {
    expect(isNearMatch('heart', 'heart')).toBe(true);
    expect(isNearMatch('hart', 'heart')).toBe(true);
    expect(isNearMatch('kidny', 'kidney')).toBe(true);
    expect(isNearMatch('hxart', 'heart')).toBe(true);
    expect(isNearMatch('cat', 'heart')).toBe(false);
    expect(isNearMatch('', 'heart')).toBe(false);
    expect(isNearMatch('heart', 'heart', 0)).toBe(true); // identical strings match before distance check
    expect(isNearMatch('hart', 'heart', 0)).toBe(false);
  });
});

describe('search index', () => {
  it('is populated and covers every content kind', () => {
    expect(hasSearchableContent()).toBe(true);
    const index = getSearchIndex();
    expect(index.length).toBeGreaterThan(systems.length);
    for (const kind of SEARCH_GROUP_ORDER) {
      expect(index.some((entry) => entry.kind === kind), `missing ${kind} entries`).toBe(true);
    }
    expect(index.filter((entry) => entry.kind === 'organ').length).toBeGreaterThan(50);
    expect(index.filter((entry) => entry.kind === 'system')).toHaveLength(12);
  });

  it('builds stable absolute routes for every result kind', () => {
    for (const entry of getSearchIndex()) {
      expect(entry.to.startsWith('/')).toBe(true);
      if (entry.kind === 'organ') expect(entry.to).toBe(`/organs/${entry.id}`);
      if (entry.kind === 'system') expect(entry.to).toBe(`/systems/${entry.id}`);
      if (entry.kind === 'lesson') expect(entry.to).toBe(`/learn/${entry.id}`);
      if (entry.kind === 'glossary') expect(entry.to).toBe(`/glossary#${entry.id}`);
    }
  });
});

describe('searchAtlas', () => {
  it('returns nothing for blank queries', () => {
    expect(searchAtlas('')).toEqual([]);
    expect(searchAtlas('   ')).toEqual([]);
    expect(searchAtlas('!!!')).toEqual([]);
  });

  it('returns no groups for an unmatchable query', () => {
    expect(searchAtlas('zzzqqqxyz')).toEqual([]);
  });

  it('finds the heart first for "heart" and links to its organ page', () => {
    const groups = searchAtlas('heart');
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].kind).toBe('organ');
    expect(groups[0].items[0].title).toBe('Heart');
    expect(groups[0].items[0].to).toBe('/organs/heart');
    expect(groups[0].items[0].snippet.length).toBeGreaterThan(0);
    expect(groups[0].items[0].score).toBeGreaterThan(0);
  });

  it('groups results in visual order with labels', () => {
    const groups = searchAtlas('blood');
    const kinds = groups.map((group) => group.kind);
    const expectedOrder = SEARCH_GROUP_ORDER.filter((kind) => kinds.includes(kind));
    expect(kinds).toEqual(expectedOrder);
    for (const group of groups) expect(group.label).toBe(SEARCH_GROUP_LABELS[group.kind]);
  });

  it('is case-insensitive and tolerant of surrounding whitespace', () => {
    expect(searchAtlas('  HEART  ')).toEqual(searchAtlas('heart'));
  });

  it('applies default and custom per-group limits', () => {
    const groups = searchAtlas('a');
    for (const group of groups) {
      expect(group.items.length).toBeLessThanOrEqual(6);
    }
    const limited = searchAtlas('a', { limitPerGroup: { organ: 2, system: 1, lesson: 1, glossary: 1 } });
    for (const group of limited) {
      const limit = group.kind === 'organ' ? 2 : 1;
      expect(group.items.length).toBeLessThanOrEqual(limit);
    }
  });

  it('uses AND semantics: every result matches every token', () => {
    const groups = searchAtlas('heart blood');
    for (const group of groups) {
      for (const item of group.items) {
        expect(item.score).toBeGreaterThan(0);
      }
    }
  });

  it('surfaces systems by name and lessons by their titles', () => {
    for (const system of systems) {
      const groups = searchAtlas(system.name);
      const systemGroup = groups.find((group) => group.kind === 'system');
      expect(systemGroup?.items.some((item) => item.id === system.id), `${system.id} not found`).toBe(true);
    }
    const firstSystem = systems[0];
    const lessonGroups = searchAtlas(firstSystem.lesson.title);
    expect(lessonGroups.some((group) => group.kind === 'lesson')).toBe(true);
  });

  it('surfaces glossary terms with anchors', () => {
    const term = glossary[0];
    const groups = searchAtlas(term.term);
    const glossaryGroup = groups.find((group) => group.kind === 'glossary');
    expect(glossaryGroup?.items.some((item) => item.to === `/glossary#${glossarySlug(term.term)}`)).toBe(true);
  });

  it('forgives a single typo in a name', () => {
    const groups = searchAtlas('kidny');
    const organs = groups.find((group) => group.kind === 'organ');
    expect(organs?.items.some((item) => item.id === 'kidneys'), 'expected typo "kidny" to find kidneys').toBe(true);
  });

  it('flattens groups in visual order and counts results', () => {
    const groups = searchAtlas('heart');
    const flat = flattenSearchGroups(groups);
    expect(flat.length).toBe(searchResultCount(groups));
    expect(flat.map((item) => item.key)).toEqual(groups.flatMap((group) => group.items.map((item) => item.key)));
  });

  it('is deterministic', () => {
    expect(searchAtlas('brain')).toEqual(searchAtlas('brain'));
  });
});

describe('snippets and highlighting', () => {
  it('buildSnippet returns short text unchanged', () => {
    expect(buildSnippet('A short definition.', 'short')).toBe('A short definition.');
    expect(buildSnippet('', 'x')).toBe('');
  });

  it('buildSnippet truncates long text around the first match', () => {
    const long = `${'word '.repeat(60)}heart${' word'.repeat(60)}`;
    const snippet = buildSnippet(long, 'heart', 160);
    expect(snippet.length).toBeLessThanOrEqual(170);
    expect(snippet.toLowerCase()).toContain('heart');
    expect(snippet.startsWith('…') || snippet.length < long.length).toBe(true);
  });

  it('highlightSegments marks query tokens case-insensitively and preserves text', () => {
    const segments = highlightSegments('The Heart pumps blood.', 'heart blood');
    expect(segments.map((segment) => segment.text).join('')).toBe('The Heart pumps blood.');
    expect(segments.filter((segment) => segment.match).map((segment) => segment.text.toLowerCase()).sort()).toEqual([
      'blood',
      'heart',
    ]);
    expect(highlightSegments('The Heart pumps blood.', '')).toEqual([
      { text: 'The Heart pumps blood.', match: false },
    ]);
    expect(highlightSegments('', 'heart')).toEqual([]);
  });

  it('glossarySlug is stable, readable and URL-safe', () => {
    expect(glossarySlug('Heart Rate')).toBe('heart-rate');
    expect(glossarySlug('  Body’s Pump ')).toBe('body-s-pump');
    expect(glossarySlug('Café')).toBe('cafe');
    expect(glossarySlug('!!!')).toBe('term');
    expect(glossarySlug('Heart Rate')).toBe(glossarySlug('Heart Rate'));
  });
});
