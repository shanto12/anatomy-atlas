/**
 * Search ranking — `searchOrgans` from `@/data`.
 *
 * The search overlay (learning-dev) consumes this ranking; these tests pin
 * the ordering contract: exact name > prefix > substring > keyword > system.
 */
import { describe, expect, it } from 'vitest';

import { organs, searchOrgans } from '@/data';

describe('searchOrgans', () => {
  it('returns an empty list for an empty or whitespace query', () => {
    expect(searchOrgans('')).toEqual([]);
    expect(searchOrgans('   ')).toEqual([]);
  });

  it('returns no results for a query that cannot match', () => {
    expect(searchOrgans('zzzqqqxyz')).toEqual([]);
  });

  it('is case-insensitive and trims surrounding whitespace', () => {
    const lower = searchOrgans('heart');
    const upper = searchOrgans('HEART');
    const padded = searchOrgans('  heart  ');
    expect(upper.map((o) => o.id)).toEqual(lower.map((o) => o.id));
    expect(padded.map((o) => o.id)).toEqual(lower.map((o) => o.id));
  });

  it('ranks the exact organ name first for every organ', () => {
    const misses: string[] = [];
    for (const organ of organs) {
      const results = searchOrgans(organ.name, 8);
      if (results[0]?.id !== organ.id) {
        misses.push(`"${organ.name}" → ${results.slice(0, 3).map((r) => r.id).join(', ') || 'no results'}`);
      }
    }
    expect(misses).toEqual([]);
  });

  it('respects the result limit and never returns duplicates', () => {
    const results = searchOrgans('a', 3);
    expect(results.length).toBeLessThanOrEqual(3);
    expect(new Set(results.map((o) => o.id)).size).toBe(results.length);
    expect(searchOrgans('a').length).toBeLessThanOrEqual(8);
    expect(searchOrgans('a', 50).length).toBeLessThanOrEqual(organs.length);
  });

  it('finds organs by keyword', () => {
    const misses: string[] = [];
    for (const organ of organs) {
      const keyword = organ.keywords[0];
      if (!keyword) continue;
      const results = searchOrgans(keyword, 8);
      if (!results.some((result) => result.id === organ.id)) {
        misses.push(`${organ.id}: keyword "${keyword}" did not surface the organ`);
      }
    }
    expect(misses).toEqual([]);
  });

  it('ranks name matches ahead of keyword/summary-only matches', () => {
    // For a real organ-name prefix, results whose name contains the query
    // must all sort above results matched only via keyword/summary/system.
    const candidates = organs
      .map((organ) => organ.name.toLowerCase())
      .filter((name) => name.length >= 5 && /^[a-z]+/.test(name));
    expect(candidates.length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const name of candidates.slice(0, 6)) {
      const query = name.slice(0, 4);
      const results = searchOrgans(query, 8);
      const nameMatchFlags = results.map((result) => result.name.toLowerCase().includes(query));
      const sortedFlags = [...nameMatchFlags].sort((a, b) => Number(b) - Number(a));
      if (nameMatchFlags.join() !== sortedFlags.join()) {
        failures.push(`query "${query}": ${JSON.stringify(nameMatchFlags)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('surfaces at least one organ for every system id query', async () => {
    const data = await import('@/data');
    const misses: string[] = [];
    for (const system of data.systems) {
      const results = searchOrgans(system.id, 8);
      if (!results.some((organ) => organ.systemId === system.id)) misses.push(system.id);
    }
    expect(misses).toEqual([]);
  });

  it('every result is a real organ with a stable id and system', () => {
    for (const result of searchOrgans('a', 8)) {
      expect(organs.some((organ) => organ.id === result.id)).toBe(true);
      expect(typeof result.systemId).toBe('string');
    }
  });
});
