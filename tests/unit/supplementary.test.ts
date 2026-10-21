/**
 * Content integrity — supplementary data: glossary, facts, history, regions.
 * Shape is defined in docs/CONTENT_SPEC.md and src/lib/types.ts.
 */
import { describe, expect, it } from 'vitest';

import { BODY_REGION_IDS, SYSTEM_IDS } from './helpers/content-spec';
import { loadSupplementary } from './helpers/content-files';

const glossary = loadSupplementary('glossary');
const facts = loadSupplementary('facts');
const history = loadSupplementary('history');
const regions = loadSupplementary('regions');

function requireParsed(loaded: ReturnType<typeof loadSupplementary>) {
  expect(loaded.exists, `${loaded.name}.json missing`).toBe(true);
  expect(loaded.error, `${loaded.name}.json invalid — ${loaded.error ?? ''}`).toBeUndefined();
  expect(Array.isArray(loaded.data), `${loaded.name}.json must contain an array`).toBe(true);
  return loaded.data as any[];
}

describe('supplementary content: glossary', () => {
  it('is populated with well-formed, unique terms', () => {
    const entries = requireParsed(glossary);
    expect(entries.length, 'glossary is empty — the glossary page has no content').toBeGreaterThan(0);
    const errors: string[] = [];
    const seen = new Set<string>();
    entries.forEach((entry, i) => {
      const at = `glossary[${i}]`;
      if (typeof entry?.term !== 'string' || !entry.term.trim()) errors.push(`${at}.term: missing`);
      else {
        const key = entry.term.trim().toLowerCase();
        if (seen.has(key)) errors.push(`${at}.term: duplicate "${entry.term}"`);
        seen.add(key);
      }
      if (typeof entry?.definition !== 'string' || !entry.definition.trim()) errors.push(`${at}.definition: missing`);
      else if (entry.definition.trim().length < 20) errors.push(`${at}.definition: suspiciously short`);
      if (typeof entry?.category !== 'string' || !entry.category.trim()) errors.push(`${at}.category: missing`);
      if (entry?.systemId !== undefined && !SYSTEM_IDS.includes(entry.systemId)) {
        errors.push(`${at}.systemId: unknown "${entry.systemId}"`);
      }
      if (entry?.related !== undefined) {
        if (!Array.isArray(entry.related) || entry.related.some((r: unknown) => typeof r !== 'string')) {
          errors.push(`${at}.related: expected string[]`);
        }
      }
    });
    expect(errors).toEqual([]);
  });
});

describe('supplementary content: facts', () => {
  it('is populated with unique ids and valid references', () => {
    const entries = requireParsed(facts);
    expect(entries.length, 'facts is empty — the home/about surfaces need facts').toBeGreaterThan(0);
    const errors: string[] = [];
    const ids = new Set<string>();
    entries.forEach((fact, i) => {
      const at = `facts[${i}]`;
      if (typeof fact?.id !== 'string' || !fact.id.trim()) errors.push(`${at}.id: missing`);
      else if (ids.has(fact.id)) errors.push(`${at}.id: duplicate "${fact.id}"`);
      else ids.add(fact.id);
      if (typeof fact?.text !== 'string' || !fact.text.trim()) errors.push(`${at}.text: missing`);
      if (fact?.systemId !== undefined && !SYSTEM_IDS.includes(fact.systemId)) {
        errors.push(`${at}.systemId: unknown "${fact.systemId}"`);
      }
      // organId resolution is validated against the full system data once loaded; see content.test.ts
    });
    expect(errors).toEqual([]);
  });
});

describe('supplementary content: history', () => {
  it('is populated with well-formed events', () => {
    const entries = requireParsed(history);
    expect(entries.length, 'history is empty — the history rail has no content').toBeGreaterThan(0);
    const errors: string[] = [];
    entries.forEach((event, i) => {
      const at = `history[${i}]`;
      if (typeof event?.year !== 'string' || !event.year.trim()) errors.push(`${at}.year: missing`);
      else if (!/\d{3,4}/.test(event.year)) errors.push(`${at}.year: no year-like number in "${event.year}"`);
      if (typeof event?.title !== 'string' || !event.title.trim()) errors.push(`${at}.title: missing`);
      if (typeof event?.description !== 'string' || !event.description.trim())
        errors.push(`${at}.description: missing`);
      if (event?.figure !== undefined && typeof event.figure !== 'string') errors.push(`${at}.figure: not a string`);
    });
    expect(errors).toEqual([]);
  });
});

describe('supplementary content: regions', () => {
  it('covers all seven body regions in canonical order with landmarks', () => {
    const entries = requireParsed(regions);
    expect(entries.map((region) => region?.id)).toEqual(BODY_REGION_IDS);
    const errors: string[] = [];
    entries.forEach((region, i) => {
      const at = `regions[${i}]`;
      expect(region?.name, `${at}.name`).toBeTruthy();
      if (typeof region?.tagline !== 'string' || !region.tagline.trim()) errors.push(`${at}.tagline: missing`);
      if (typeof region?.description !== 'string' || !region.description.trim()) errors.push(`${at}.description: missing`);
      if (!Array.isArray(region?.landmarks) || region.landmarks.length < 2) {
        errors.push(`${at}.landmarks: expected at least 2 landmarks`);
      } else if (region.landmarks.some((l: unknown) => typeof l !== 'string' || !(l as string).trim())) {
        errors.push(`${at}.landmarks: contains empty/non-string`);
      }
    });
    expect(errors).toEqual([]);
  });
});
