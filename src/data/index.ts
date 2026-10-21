import type { AnatomySystem, Fact, GlossaryTerm, HistoryEvent, Organ, RegionInfo, SystemId } from '@/lib/types';
import { SYSTEM_ORDER } from '@/lib/types';

import glossaryData from '@/data/glossary.json';
import factsData from '@/data/facts.json';
import historyData from '@/data/history.json';
import regionsData from '@/data/regions.json';

const systemModules = import.meta.glob<AnatomySystem>('./systems/*.json', {
  eager: true,
  import: 'default',
});

/** All systems, in canonical teaching order. */
export const systems: AnatomySystem[] = Object.values(systemModules).sort(
  (a, b) => SYSTEM_ORDER.indexOf(a.id) - SYSTEM_ORDER.indexOf(b.id),
);

export const systemsById = Object.fromEntries(systems.map((s) => [s.id, s])) as Record<
  SystemId,
  AnatomySystem | undefined
>;

/** Every organ across every system, flattened. */
export const organs: Organ[] = systems.flatMap((s) => s.organs);

export const organsById = Object.fromEntries(organs.map((o) => [o.id, o])) as Record<string, Organ | undefined>;

export const lessons = systems.map((s) => s.lesson);

export const lessonsById = Object.fromEntries(lessons.map((l) => [l.id, l]));

export const glossary = glossaryData as GlossaryTerm[];
export const facts = factsData as Fact[];
export const history = historyData as HistoryEvent[];
export const regions = regionsData as RegionInfo[];

export function getSystem(id: string | undefined): AnatomySystem | undefined {
  if (!id) return undefined;
  return systemsById[id as SystemId];
}

export function getOrgan(id: string | undefined): Organ | undefined {
  if (!id) return undefined;
  return organsById[id];
}

export function getOrgansForSystem(systemId: SystemId): Organ[] {
  return systemsById[systemId]?.organs ?? [];
}

export function getRelatedOrgans(organ: Organ): Organ[] {
  return organ.relatedOrgans.map((id) => organsById[id]).filter((o): o is Organ => Boolean(o));
}

export function getSystemForOrgan(organ: Organ): AnatomySystem | undefined {
  return systemsById[organ.systemId];
}

export function getLesson(id: string | undefined) {
  if (!id) return undefined;
  return lessonsById[id];
}

export interface SiteStats {
  systemCount: number;
  organCount: number;
  lessonCount: number;
  quizCount: number;
  stepCount: number;
}

export const siteStats: SiteStats = {
  systemCount: systems.length,
  organCount: organs.length,
  lessonCount: lessons.length,
  quizCount: systems.reduce((n, s) => n + s.quiz.length, 0),
  stepCount: lessons.reduce((n, l) => n + l.steps.length, 0),
};

export function searchOrgans(query: string, limit = 8): Organ[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = organs
    .map((organ) => {
      let score = 0;
      const name = organ.name.toLowerCase();
      if (name === q) score += 100;
      else if (name.startsWith(q)) score += 60;
      else if (name.includes(q)) score += 35;
      if (organ.alsoKnownAs?.some((a) => a.toLowerCase().includes(q))) score += 25;
      if (organ.keywords.some((k) => k.toLowerCase().includes(q))) score += 20;
      if (organ.systemId.includes(q)) score += 12;
      if (organ.summary.toLowerCase().includes(q)) score += 6;
      return { organ, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map((x) => x.organ);
}
