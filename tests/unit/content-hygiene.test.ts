/**
 * Content hygiene — voice, formatting, safety and source rules from
 * docs/CONTENT_SPEC.md ("Non-negotiable rules" and "Acceptance checklist").
 */
import { describe, expect, it } from 'vitest';

import { loadParsedSystems, collectSystemStrings, collectSupplementaryStrings, loadSupplementary, type SupplementaryName } from './helpers/content-files';

const ALL_STRINGS: { where: string; text: string }[] = [
  ...loadParsedSystems().flatMap((loaded) => collectSystemStrings(loaded.data)),
  ...(['glossary', 'facts', 'history', 'regions'] as SupplementaryName[]).flatMap((name) => {
    const loaded = loadSupplementary(name);
    return Array.isArray(loaded.data) ? collectSupplementaryStrings(name, loaded.data) : [];
  }),
];

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
const HTML_TAG = /<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?>/i;
const MARKDOWN = /(\*\*|__|(?:^|\n)\s*#{1,6}\s|\[[^\]]+\]\([^)]+\)|`[^`]+`)/;
const BULLET = /[•·▪◦‣⁃]/;
const FORBIDDEN_VOICE = [/\bdelve\b/i, /fast-paced world/i, /\bgame[- ]changer\b/i, /unlock the (secrets|mysteries)/i];
// Only dosing/administration instructions are a problem; factual measurements
// such as "the gland weighs 30 to 40 mg" or "a bladder holds 500 mL" are fine.
const DOSAGE = /\b(?:take|use|apply|inject|swallow|administer)\s+(?:\d|one|two|three|four|five)[^.]{0,24}\b(?:mg|mcg|µg|iu|ml)\b/i;
const DIRECTIVE = /\byou should (?:take|use|apply|see|consult|stop|start)\b/i;
const BRITISH_SPELLINGS = /\b(colour|behaviour|oesophag\w*|haematolog\w*|paediatr\w*|foet\w*|oedema|aetiolog\w*|anaemi\w*|gynaecolog\w*|orthopaed\w*|tumour\w*|programme|defence|licence|practise|dialyse|analyse|paralyse|grey|centres?|litres?|metres?|millilitres?|centimetres?)\b/i;

describe('content hygiene', () => {
  it('authored strings are free of markdown, HTML, emoji and bullet characters', () => {
    const problems: string[] = [];
    for (const { where, text } of ALL_STRINGS) {
      if (!text) continue;
      if (MARKDOWN.test(text)) problems.push(`${where}: markdown syntax — ${excerpt(text)}`);
      if (HTML_TAG.test(text)) problems.push(`${where}: HTML tag — ${excerpt(text)}`);
      if (EMOJI.test(text)) problems.push(`${where}: emoji/symbol — ${excerpt(text)}`);
      if (BULLET.test(text)) problems.push(`${where}: bullet character — ${excerpt(text)}`);
      if (text !== text.trim()) problems.push(`${where}: leading/trailing whitespace`);
    }
    expect(problems).toEqual([]);
  });

  it('avoids generic AI voice phrasing', () => {
    const problems: string[] = [];
    for (const { where, text } of ALL_STRINGS) {
      for (const pattern of FORBIDDEN_VOICE) {
        if (pattern.test(text)) problems.push(`${where}: forbidden phrasing ${excerpt(text)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('contains no medical advice, dosages, or directives', () => {
    const problems: string[] = [];
    for (const { where, text } of ALL_STRINGS) {
      if (DOSAGE.test(text)) problems.push(`${where}: dosage-like text — ${excerpt(text)}`);
      if (DIRECTIVE.test(text)) problems.push(`${where}: directive medical advice — ${excerpt(text)}`);
    }
    expect(problems).toEqual([]);
  });

  it('uses US English spelling', () => {
    const problems: string[] = [];
    for (const { where, text } of ALL_STRINGS) {
      const match = text.match(BRITISH_SPELLINGS);
      if (match) problems.push(`${where}: British spelling "${match[0]}" — ${excerpt(text)}`);
    }
    expect(problems).toEqual([]);
  });

  it('sources are https, on the allowlist, and not duplicated per system', async () => {
    const { isAllowedSourceHost } = await import('./helpers/content-spec');
    const problems: string[] = [];
    for (const loaded of loadParsedSystems()) {
      for (const organ of loaded.data.organs ?? []) {
        const seen = new Set<string>();
        for (const source of organ.sources ?? []) {
          if (typeof source?.url !== 'string') continue;
          try {
            const url = new URL(source.url);
            if (url.protocol !== 'https:') problems.push(`${organ.id}: non-https source ${source.url}`);
            if (!isAllowedSourceHost(url.hostname)) problems.push(`${organ.id}: off-allowlist host ${url.hostname}`);
            if (seen.has(source.url)) problems.push(`${organ.id}: duplicate source ${source.url}`);
            seen.add(source.url);
          } catch {
            problems.push(`${organ.id}: malformed source URL ${source.url}`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 90 ? `"${flat.slice(0, 90)}…"` : `"${flat}"`;
}
