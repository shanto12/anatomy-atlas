import { getOrgan, getSystem } from '@/data';
import type { BodyRegion, SystemId } from '@/lib/types';

import { ORGAN_PLACEMENTS } from './anatomy';
import { SYSTEM_LIST, SYSTEM_META, SYSTEM_ORGAN_COUNT } from './systems';

/**
 * The viewer's catalogue merges authored content from `@/data` with the built-in anatomical
 * placement table. The placement table is complete (all 95 organ ids from the content spec),
 * so the explorer and the 3D model keep working while content JSON is still being written.
 */
export interface CatalogSystem {
  id: SystemId;
  name: string;
  shortName: string;
  tagline: string;
  color: string;
  count: number;
  hasContent: boolean;
}

export interface CatalogOrgan {
  id: string;
  name: string;
  systemId: SystemId;
  systemName: string;
  systemShortName: string;
  systemColor: string;
  region: BodyRegion;
  tagline?: string;
  latin?: string;
  hasContent: boolean;
  /** Lower-cased haystack for instant client-side filtering. */
  searchText: string;
}

export const CATALOG_SYSTEMS: CatalogSystem[] = SYSTEM_LIST.map((meta) => {
  const data = getSystem(meta.id);
  return {
    id: meta.id,
    name: data?.name ?? meta.name,
    shortName: data?.shortName ?? meta.shortName,
    tagline: data?.tagline ?? meta.tagline,
    color: data?.color ?? meta.color,
    count: data?.organs.length || SYSTEM_ORGAN_COUNT[meta.id],
    hasContent: Boolean(data),
  };
});

const SYSTEM_BY_ID = Object.fromEntries(CATALOG_SYSTEMS.map((s) => [s.id, s])) as Record<SystemId, CatalogSystem>;

export const CATALOG_ORGANS: CatalogOrgan[] = ORGAN_PLACEMENTS.map((placement) => {
  const data = getOrgan(placement.id);
  const system = SYSTEM_BY_ID[placement.systemId] ?? SYSTEM_META[placement.systemId];
  const name = data?.name ?? placement.name;
  return {
    id: placement.id,
    name,
    systemId: placement.systemId,
    systemName: system.name,
    systemShortName: system.shortName,
    systemColor: system.color,
    region: data?.region ?? placement.region,
    tagline: data?.tagline,
    latin: data?.latin,
    hasContent: Boolean(data),
    searchText: [
      name,
      placement.name,
      data?.alsoKnownAs?.join(' ') ?? '',
      data?.keywords?.join(' ') ?? '',
      system.name,
      system.shortName,
      placement.region,
    ]
      .join(' ')
      .toLowerCase(),
  };
});

export const CATALOG_ORGAN_BY_ID = Object.fromEntries(CATALOG_ORGANS.map((o) => [o.id, o])) as Record<
  string,
  CatalogOrgan | undefined
>;

export const CATALOG_ORGANS_BY_SYSTEM = Object.fromEntries(
  CATALOG_SYSTEMS.map((system) => [system.id, CATALOG_ORGANS.filter((o) => o.systemId === system.id)]),
) as Record<SystemId, CatalogOrgan[]>;

export const CATALOG_SYSTEM_BY_ID = SYSTEM_BY_ID;

export function getCatalogOrgan(id: string | null | undefined): CatalogOrgan | undefined {
  if (!id) return undefined;
  return CATALOG_ORGAN_BY_ID[id];
}

export interface OrganGroup {
  system: CatalogSystem;
  organs: CatalogOrgan[];
}

/** Organs grouped for the explorer list, honouring an optional system filter and search query. */
export function groupCatalogOrgans(query = '', activeSystem: SystemId | null = null): OrganGroup[] {
  const q = query.trim().toLowerCase();
  const systems = activeSystem ? CATALOG_SYSTEMS.filter((s) => s.id === activeSystem) : CATALOG_SYSTEMS;
  const groups: OrganGroup[] = [];
  for (const system of systems) {
    const organs = CATALOG_ORGANS_BY_SYSTEM[system.id].filter((organ) => !q || organ.searchText.includes(q));
    if (organs.length > 0) groups.push({ system, organs });
  }
  return groups;
}
