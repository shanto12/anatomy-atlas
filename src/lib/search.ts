import { BODY_REGIONS } from '@/lib/types';
import type { BodyRegion, GlossaryTerm, SystemId } from '@/lib/types';
import { glossary, lessons, organs, systems } from '@/data';

/**
 * Global search for Anatomy Atlas.
 *
 * One weighted index across organs, systems, lessons and glossary terms.
 * Scoring is intentionally transparent: exact names beat prefixes, prefixes
 * beat substrings, keywords beat prose, and one typo is forgiven on a name.
 * Results are grouped so the overlay can present the atlas the way a reader
 * thinks about it.
 */

export type SearchKind = 'organ' | 'system' | 'lesson' | 'glossary';

export const SEARCH_GROUP_ORDER: SearchKind[] = ['organ', 'system', 'lesson', 'glossary'];

export const SEARCH_GROUP_LABELS: Record<SearchKind, string> = {
  organ: 'Organs',
  system: 'Body systems',
  lesson: 'Guided lessons',
  glossary: 'Glossary',
};

const DEFAULT_LIMIT_PER_GROUP: Record<SearchKind, number> = {
  organ: 6,
  system: 3,
  lesson: 3,
  glossary: 4,
};

export interface SearchEntry {
  key: string;
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  to: string;
  /** Long text used to build a highlight snippet. */
  snippetSource: string;
  primary: string;
  aliases: string[];
  body: string;
}

export interface SearchResultItem {
  key: string;
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  to: string;
  score: number;
  snippet: string;
}

export interface SearchGroup {
  kind: SearchKind;
  label: string;
  items: SearchResultItem[];
}

/* ------------------------------------------------------------------ */
/* Normalisation & fuzzy helpers                                       */
/* ------------------------------------------------------------------ */

const DIACRITICS = /[\u0300-\u036f]/g;

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
}

export function tokenizeQuery(query: string): string[] {
  return normalizeSearchText(query)
    .split(/[^a-z0-9']+/)
    .map((token) => token.replace(/^'+|'+$/g, ''))
    .filter((token) => token.length > 0);
}

/** Bounded Levenshtein check — cheap enough for a few hundred short words. */
export function isNearMatch(a: string, b: string, maxDistance = 1): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (Math.abs(a.length - b.length) > maxDistance) return false;
  if (maxDistance <= 0) return false;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowBest = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      const insertion = current[j - 1] + 1;
      const deletion = previous[j] + 1;
      const value = Math.min(substitution, insertion, deletion);
      current[j] = value;
      if (value < rowBest) rowBest = value;
    }
    if (rowBest > maxDistance) return false;
    previous = current;
  }
  return previous[b.length] <= maxDistance;
}

function wordsOf(text: string): string[] {
  return text.split(/[^a-z0-9']+/).filter(Boolean);
}

function regionName(region: BodyRegion): string {
  return BODY_REGIONS.find((entry) => entry.id === region)?.name ?? region;
}

/* ------------------------------------------------------------------ */
/* Index                                                               */
/* ------------------------------------------------------------------ */

function buildIndex(): SearchEntry[] {
  const systemNameById = new Map(systems.map((system) => [system.id, system.name]));
  const entries: SearchEntry[] = [];

  for (const organ of organs) {
    const systemName = systemNameById.get(organ.systemId) ?? '';
    entries.push({
      key: `organ:${organ.id}`,
      kind: 'organ',
      id: organ.id,
      title: organ.name,
      subtitle: organ.tagline,
      meta: [systemName, regionName(organ.region)].filter(Boolean).join(' · '),
      to: `/organs/${organ.id}`,
      snippetSource: organ.summary,
      primary: normalizeSearchText([organ.name, organ.latin].filter(Boolean).join(' ')),
      aliases: [
        ...(organ.alsoKnownAs ?? []),
        ...(organ.keywords ?? []),
        regionName(organ.region),
        systemName,
      ]
        .filter(Boolean)
        .map(normalizeSearchText),
      body: normalizeSearchText(
        [
          organ.tagline,
          organ.summary,
          organ.location,
          organ.size,
          ...organ.functions.map((item) => `${item.title} ${item.detail}`),
          ...organ.conditions.map((item) => `${item.name} ${item.description}`),
          ...organ.facts,
          ...organ.keywords,
        ].join(' '),
      ),
    });
  }

  for (const system of systems) {
    entries.push({
      key: `system:${system.id}`,
      kind: 'system',
      id: system.id,
      title: system.name,
      subtitle: system.tagline,
      meta: `${system.shortName} · ${system.organs.length} organs`,
      to: `/systems/${system.id}`,
      snippetSource: system.summary,
      primary: normalizeSearchText(`${system.name} ${system.shortName}`),
      aliases: [system.shortName].map(normalizeSearchText),
      body: normalizeSearchText(
        [system.summary, ...system.functions, ...system.organs.map((organ) => organ.name)].join(' '),
      ),
    });
  }

  for (const lesson of lessons) {
    const systemId = lesson.id.replace('lesson-', '') as SystemId;
    const system = systemNameById.get(systemId) ?? '';
    entries.push({
      key: `lesson:${lesson.id}`,
      kind: 'lesson',
      id: lesson.id,
      title: lesson.title,
      subtitle: lesson.subtitle,
      meta: [system, lesson.level === 'beginner' ? 'Beginner' : 'Intermediate', `${lesson.durationMin} min`]
        .filter(Boolean)
        .join(' · '),
      to: `/learn/${lesson.id}`,
      snippetSource: lesson.subtitle,
      primary: normalizeSearchText(lesson.title),
      aliases: [system].filter(Boolean).map(normalizeSearchText),
      body: normalizeSearchText(
        [
          lesson.subtitle,
          ...lesson.steps.map((step) => `${step.title} ${step.body} ${step.keyPoint ?? ''}`),
        ].join(' '),
      ),
    });
  }

  for (const term of glossary) {
    const system = term.systemId ? (systemNameById.get(term.systemId) ?? '') : '';
    entries.push({
      key: `glossary:${glossarySlug(term.term)}`,
      kind: 'glossary',
      id: glossarySlug(term.term),
      title: term.term,
      subtitle: term.definition,
      meta: [term.category, system].filter(Boolean).join(' · '),
      to: `/glossary#${glossarySlug(term.term)}`,
      snippetSource: term.definition,
      primary: normalizeSearchText(term.term),
      aliases: [term.category, ...(term.related ?? [])].filter(Boolean).map(normalizeSearchText),
      body: normalizeSearchText([term.definition, term.category, ...(term.related ?? [])].join(' ')),
    });
  }

  return entries;
}

let cachedIndex: SearchEntry[] | null = null;

export function getSearchIndex(): SearchEntry[] {
  if (!cachedIndex) cachedIndex = buildIndex();
  return cachedIndex;
}

/** True when there is anything at all to search (content may still be landing). */
export function hasSearchableContent(): boolean {
  return getSearchIndex().length > 0;
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

function scoreToken(
  token: string,
  entry: SearchEntry,
  primaryWords: string[],
  aliasWords: string[],
): number {
  if (entry.primary === token) return 60;
  if (primaryWords.includes(token)) return 48;
  if (entry.primary.startsWith(token)) return 42;
  if (primaryWords.some((word) => word.startsWith(token))) return 36;
  if (entry.primary.includes(token)) return 26;
  if (entry.aliases.includes(token)) return 30;
  if (entry.aliases.some((alias) => alias.startsWith(token))) return 22;
  if (aliasWords.includes(token)) return 20;
  if (entry.aliases.some((alias) => alias.includes(token))) return 14;
  if (entry.body.includes(token)) return 6;

  // Forgive a single typo — but only on names and words long enough to matter.
  if (token.length >= 4) {
    if (primaryWords.some((word) => word.length >= 4 && isNearMatch(token, word))) return 16;
    if (aliasWords.some((word) => word.length >= 4 && isNearMatch(token, word))) return 9;
  }
  return 0;
}

function scoreEntry(entry: SearchEntry, query: string, tokens: string[]): number {
  const normalizedQuery = normalizeSearchText(query);
  const primaryWords = wordsOf(entry.primary);
  const aliasWords = entry.aliases.flatMap(wordsOf);

  let score = 0;
  for (const token of tokens) {
    const tokenScore = scoreToken(token, entry, primaryWords, aliasWords);
    if (tokenScore === 0) return 0; // every token must match somewhere (AND semantics)
    score += tokenScore;
  }

  // Whole-query bonuses reward someone typing the exact name.
  if (entry.primary === normalizedQuery) score += 80;
  else if (primaryWords.includes(normalizedQuery)) score += 55;
  else if (entry.primary.startsWith(normalizedQuery)) score += 34;
  else if (entry.primary.includes(normalizedQuery)) score += 18;

  if (entry.subtitle && normalizeSearchText(entry.subtitle).includes(normalizedQuery)) score += 10;
  if (entry.meta && normalizeSearchText(entry.meta).includes(normalizedQuery)) score += 6;
  if (entry.body.includes(normalizedQuery)) score += 4;

  return score;
}

/* ------------------------------------------------------------------ */
/* Snippets & highlighting                                             */
/* ------------------------------------------------------------------ */

export function buildSnippet(text: string, query: string, maxLength = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= maxLength) return clean;

  const tokens = tokenizeQuery(query);
  const lower = clean.toLowerCase();
  let firstHit = -1;
  for (const token of tokens) {
    const index = lower.indexOf(token);
    if (index >= 0 && (firstHit < 0 || index < firstHit)) firstHit = index;
  }

  let start = 0;
  if (firstHit > 60) {
    start = clean.lastIndexOf(' ', firstHit - 40);
    if (start < 0) start = firstHit - 40;
    if (start > 0) start += 1;
  }

  let end = Math.min(clean.length, start + maxLength);
  if (end < clean.length) {
    const lastSpace = clean.lastIndexOf(' ', end - 10);
    if (lastSpace > start + 40) end = lastSpace;
  }

  const prefix = start > 0 ? '…' : '';
  const suffix = end < clean.length ? '…' : '';
  return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Split text into plain/matched segments so React can render <mark> safely. */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
  if (!text) return [];
  const tokens = Array.from(new Set(tokenizeQuery(query).filter((token) => token.length > 0))).sort(
    (a, b) => b.length - a.length,
  );
  if (tokens.length === 0) return [{ text, match: false }];

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);
  const lowerTokens = new Set(tokens);
  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, match: lowerTokens.has(part.toLowerCase()) }));
}

/* ------------------------------------------------------------------ */
/* Public search                                                       */
/* ------------------------------------------------------------------ */

export interface SearchOptions {
  limitPerGroup?: Partial<Record<SearchKind, number>>;
}

export function searchAtlas(query: string, options: SearchOptions = {}): SearchGroup[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const tokens = tokenizeQuery(trimmed);
  if (tokens.length === 0) return [];

  const scored = getSearchIndex()
    .map((entry) => ({ entry, score: scoreEntry(entry, trimmed, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));

  const groups: SearchGroup[] = [];
  for (const kind of SEARCH_GROUP_ORDER) {
    const limit = options.limitPerGroup?.[kind] ?? DEFAULT_LIMIT_PER_GROUP[kind];
    const items = scored
      .filter((item) => item.entry.kind === kind)
      .slice(0, limit)
      .map(({ entry, score }) => ({
        key: entry.key,
        kind: entry.kind,
        id: entry.id,
        title: entry.title,
        subtitle: entry.subtitle,
        meta: entry.meta,
        to: entry.to,
        score,
        snippet:
          kind === 'glossary'
            ? buildSnippet(entry.snippetSource, trimmed, 140)
            : buildSnippet(entry.snippetSource, trimmed),
      }));
    if (items.length > 0) {
      groups.push({ kind, label: SEARCH_GROUP_LABELS[kind], items });
    }
  }
  return groups;
}

/** Flat list in visual order — used for ↑/↓ keyboard navigation. */
export function flattenSearchGroups(groups: readonly SearchGroup[]): SearchResultItem[] {
  return groups.flatMap((group) => group.items);
}

export function searchResultCount(groups: readonly SearchGroup[]): number {
  return groups.reduce((total, group) => total + group.items.length, 0);
}

/** Suggested starting points for the empty search state. */
export const SEARCH_SUGGESTIONS = ['Heart', 'Brain', 'Bones', 'Blood', 'Breathing', 'Digestion'] as const;

/* ------------------------------------------------------------------ */
/* Glossary anchors                                                    */
/* ------------------------------------------------------------------ */

/** Stable, human-readable anchor for a glossary term (used by search + page). */
export function glossarySlug(term: string): string {
  const slug = normalizeSearchText(term)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'term';
}

/** Convenience wrapper for glossary rows. */
export function glossaryTermAnchor(term: GlossaryTerm): string {
  return glossarySlug(term.term);
}
