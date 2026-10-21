/**
 * Content integrity — the system/organ half of docs/CONTENT_SPEC.md.
 *
 * These tests intentionally fail while the content factory is incomplete and
 * list every deviation they find, so defects can be routed to the owner with
 * exact paths instead of a bare assertion diff.
 */
import { describe, expect, it } from 'vitest';

import { SYSTEM_ORDER } from '@/lib/types';
import { loadParsedSystems, loadSystems, listSystemFiles } from './helpers/content-files';
import {
  ALL_ORGAN_IDS,
  BODY_REGION_IDS,
  DIFFICULTIES,
  ORGAN_SPEC_BY_ID,
  SYSTEM_SPECS,
  isAllowedSourceHost,
  paragraphCount,
  wordCount,
} from './helpers/content-spec';

describe('content factory completeness', () => {
  it('has exactly the 12 required system files on disk', () => {
    const files = listSystemFiles().sort();
    const expected = SYSTEM_SPECS.map((s) => `${s.id}.json`).sort();
    expect(files).toEqual(expected);
  });

  it('every system file parses as JSON and carries the expected id', () => {
    const problems: string[] = [];
    for (const loaded of loadSystems()) {
      if (!loaded.exists) {
        problems.push(`${loaded.spec.id}: missing ${loaded.file}`);
        continue;
      }
      if (loaded.error) {
        problems.push(`${loaded.spec.id}: invalid JSON — ${loaded.error}`);
        continue;
      }
      if (loaded.data?.id !== loaded.spec.id) {
        problems.push(`${loaded.spec.id}: file id is ${JSON.stringify(loaded.data?.id)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('all 12 systems are available to the app in canonical order', async () => {
    const { systems } = await import('@/data');
    expect(systems.map((s) => s.id)).toEqual(SYSTEM_ORDER);
    expect(SYSTEM_ORDER).toHaveLength(12);
  });

  it('flattens exactly the spec organ universe with no duplicate organ ids', async () => {
    const { organs } = await import('@/data');
    const ids = organs.map((o) => o.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect([...new Set(duplicates)]).toEqual([]);
    expect([...ids].sort()).toEqual([...ALL_ORGAN_IDS].sort());
    expect(ids).toHaveLength(ALL_ORGAN_IDS.length);
  });
});

describe.each(loadParsedSystems().map((loaded) => [loaded.spec.id, loaded] as const))(
  'system content: %s',
  (_id, loaded) => {
    const system: any = loaded.data;
    const spec = loaded.spec;

    it('matches the spec metadata', () => {
      const errors: string[] = [];
      if (system.color?.toLowerCase() !== spec.color) {
        errors.push(`color: expected ${spec.color}, got ${JSON.stringify(system.color)}`);
      }
      if (typeof system.name !== 'string' || !system.name.includes(spec.name.split(' ')[0])) {
        errors.push(`name: expected to contain "${spec.name.split(' ')[0]}", got ${JSON.stringify(system.name)}`);
      }
      if (typeof system.shortName !== 'string' || !system.shortName.trim()) errors.push('shortName: missing');
      else if (system.shortName.trim().split(/\s+/).length > 2) errors.push(`shortName: >2 words (${system.shortName})`);
      if (typeof system.tagline !== 'string' || !system.tagline.trim()) errors.push('tagline: missing');
      else if (system.tagline.length > 70) errors.push(`tagline: ${system.tagline.length} chars (max 70)`);
      expect(errors).toEqual([]);
    });

    it('summary is 180–240 words in 2–3 paragraphs', () => {
      const summary = typeof system.summary === 'string' ? system.summary : '';
      const words = wordCount(summary);
      const paragraphs = paragraphCount(summary);
      expect(
        {
          words: { value: words, ok: words >= 180 && words <= 240 },
          paragraphs: { value: paragraphs, ok: paragraphs >= 2 && paragraphs <= 3 },
        },
        `summary word/paragraph counts out of spec`,
      ).toEqual({
        words: { value: words, ok: true },
        paragraphs: { value: paragraphs, ok: true },
      });
    });

    it('stats: exactly 3 value/label pairs without trailing periods', () => {
      const stats = Array.isArray(system.stats) ? system.stats : [];
      expect(stats).toHaveLength(3);
      const errors: string[] = [];
      stats.forEach((stat: any, i: number) => {
        if (typeof stat?.value !== 'string' || !stat.value.trim()) errors.push(`stats[${i}].value: missing`);
        if (typeof stat?.label !== 'string' || !stat.label.trim()) errors.push(`stats[${i}].label: missing`);
        else if (stat.label.trim().endsWith('.')) errors.push(`stats[${i}].label: trailing period (${stat.label})`);
      });
      expect(errors).toEqual([]);
    });

    it('functions: 4–6 short strings, each at most 95 chars', () => {
      const functions = Array.isArray(system.functions) ? system.functions : [];
      const errors: string[] = [];
      if (functions.length < 4 || functions.length > 6) errors.push(`functions: ${functions.length} (expected 4–6)`);
      functions.forEach((fn: unknown, i: number) => {
        if (typeof fn !== 'string' || !(fn as string).trim()) errors.push(`functions[${i}]: missing`);
        else if ((fn as string).length > 95) errors.push(`functions[${i}]: ${(fn as string).length} chars (max 95)`);
      });
      expect(errors).toEqual([]);
    });

    it('organs match the required ids, order, and systemId', () => {
      const organs = Array.isArray(system.organs) ? system.organs : [];
      expect(organs.map((o: any) => o?.id)).toEqual(spec.organs);
      const errors: string[] = [];
      organs.forEach((organ: any) => {
        if (organ?.systemId !== spec.id) {
          errors.push(`${organ?.id}.systemId: ${JSON.stringify(organ?.systemId)} (expected ${spec.id})`);
        }
        if (ORGAN_SPEC_BY_ID.get(organ?.id) !== spec.id) {
          errors.push(`${organ?.id}: not a {spec.id} organ in CONTENT_SPEC`);
        }
      });
      expect(errors).toEqual([]);
    });

    it('every organ satisfies the full field contract', () => {
      const organs = Array.isArray(system.organs) ? system.organs : [];
      const errors: string[] = [];
      const validRegions = new Set<string>(BODY_REGION_IDS);
      const validDifficulties = new Set<string>(DIFFICULTIES);

      for (const organ of organs) {
        const at = `organ ${organ?.id ?? '<missing id>'}`;
        if (!organ || typeof organ !== 'object') {
          errors.push(`${at}: not an object`);
          continue;
        }
        if (typeof organ.name !== 'string' || !organ.name.trim()) errors.push(`${at}.name: missing`);
        if (organ.latin !== undefined && typeof organ.latin !== 'string') errors.push(`${at}.latin: not a string`);
        if (organ.alsoKnownAs !== undefined) {
          if (!Array.isArray(organ.alsoKnownAs) || organ.alsoKnownAs.length > 2) {
            errors.push(`${at}.alsoKnownAs: expected array of 0–2 strings`);
          } else if (organ.alsoKnownAs.some((a: unknown) => typeof a !== 'string' || !(a as string).trim())) {
            errors.push(`${at}.alsoKnownAs: contains empty/non-string`);
          }
        }
        if (!validRegions.has(organ.region)) errors.push(`${at}.region: invalid "${organ.region}"`);
        if (typeof organ.tagline !== 'string' || !organ.tagline.trim()) errors.push(`${at}.tagline: missing`);
        else if (organ.tagline.length > 80) errors.push(`${at}.tagline: ${organ.tagline.length} chars (max 80)`);

        if (typeof organ.summary !== 'string' || !organ.summary.trim()) errors.push(`${at}.summary: missing`);
        else {
          const words = wordCount(organ.summary);
          if (words < 110 || words > 170) errors.push(`${at}.summary: ${words} words (expected 110–170)`);
          const paragraphs = paragraphCount(organ.summary);
          if (paragraphs !== 2) errors.push(`${at}.summary: ${paragraphs} paragraphs (expected 2)`);
        }

        if (!Array.isArray(organ.functions) || organ.functions.length < 3 || organ.functions.length > 5) {
          errors.push(`${at}.functions: expected 3–5 objects`);
        } else {
          organ.functions.forEach((fn: any, i: number) => {
            if (typeof fn?.title !== 'string' || !fn.title.trim()) errors.push(`${at}.functions[${i}].title: missing`);
            if (typeof fn?.detail !== 'string' || !fn.detail.trim()) errors.push(`${at}.functions[${i}].detail: missing`);
            else {
              const words = wordCount(fn.detail);
              if (words < 12 || words > 40) errors.push(`${at}.functions[${i}].detail: ${words} words (expected 12–40)`);
            }
          });
        }

        if (typeof organ.location !== 'string' || !organ.location.trim()) errors.push(`${at}.location: missing`);
        if (typeof organ.size !== 'string' || !organ.size.trim()) errors.push(`${at}.size: missing`);

        if (!Array.isArray(organ.facts) || organ.facts.length !== 3) {
          errors.push(`${at}.facts: expected exactly 3`);
        } else if (organ.facts.some((f: unknown) => typeof f !== 'string' || !(f as string).trim())) {
          errors.push(`${at}.facts: contains empty/non-string`);
        }

        if (!Array.isArray(organ.conditions) || organ.conditions.length < 2 || organ.conditions.length > 3) {
          errors.push(`${at}.conditions: expected 2–3 objects`);
        } else {
          organ.conditions.forEach((c: any, i: number) => {
            if (typeof c?.name !== 'string' || !c.name.trim()) errors.push(`${at}.conditions[${i}].name: missing`);
            if (typeof c?.description !== 'string' || !c.description.trim())
              errors.push(`${at}.conditions[${i}].description: missing`);
          });
        }

        if (!Array.isArray(organ.relatedOrgans) || organ.relatedOrgans.length < 2 || organ.relatedOrgans.length > 4) {
          errors.push(`${at}.relatedOrgans: expected 2–4 ids`);
        } else {
          const seen = new Set<string>();
          organ.relatedOrgans.forEach((ref: unknown, i: number) => {
            if (typeof ref !== 'string') {
              errors.push(`${at}.relatedOrgans[${i}]: not a string`);
              return;
            }
            if (ref === organ.id) errors.push(`${at}.relatedOrgans[${i}]: references itself`);
            if (seen.has(ref)) errors.push(`${at}.relatedOrgans[${i}]: duplicate "${ref}"`);
            seen.add(ref);
            if (!ORGAN_SPEC_BY_ID.has(ref)) errors.push(`${at}.relatedOrgans[${i}]: unknown organ "${ref}"`);
          });
        }

        if (!Array.isArray(organ.keywords) || organ.keywords.length < 3 || organ.keywords.length > 6) {
          errors.push(`${at}.keywords: expected 3–6`);
        } else {
          organ.keywords.forEach((keyword: unknown, i: number) => {
            if (typeof keyword !== 'string' || !(keyword as string).trim()) {
              errors.push(`${at}.keywords[${i}]: missing`);
            } else if ((keyword as string) !== (keyword as string).toLowerCase()) {
              errors.push(`${at}.keywords[${i}]: not lowercase ("${keyword}")`);
            }
          });
        }

        if (!Array.isArray(organ.sources) || organ.sources.length !== 2) {
          errors.push(`${at}.sources: expected exactly 2`);
        } else {
          organ.sources.forEach((source: any, i: number) => {
            if (typeof source?.label !== 'string' || !source.label.trim())
              errors.push(`${at}.sources[${i}].label: missing`);
            if (typeof source?.url !== 'string') {
              errors.push(`${at}.sources[${i}].url: missing`);
              return;
            }
            let parsed: URL | undefined;
            try {
              parsed = new URL(source.url);
            } catch {
              errors.push(`${at}.sources[${i}].url: not a valid URL (${source.url})`);
              return;
            }
            if (parsed.protocol !== 'https:') errors.push(`${at}.sources[${i}].url: not https (${source.url})`);
            if (!isAllowedSourceHost(parsed.hostname)) {
              errors.push(`${at}.sources[${i}].url: host "${parsed.hostname}" not on allowlist`);
            }
          });
        }

        if (organ.heroStat !== undefined) {
          if (typeof organ.heroStat?.value !== 'string' || organ.heroStat.value.length > 12) {
            errors.push(`${at}.heroStat.value: expected string of at most 12 chars`);
          }
          if (typeof organ.heroStat?.label !== 'string' || organ.heroStat.label.length > 24) {
            errors.push(`${at}.heroStat.label: expected string of at most 24 chars`);
          }
        }
      }
      expect(errors).toEqual([]);
      // keep the imported helper referenced in case the contract grows
      expect(validDifficulties.size).toBe(3);
    });
  },
);
