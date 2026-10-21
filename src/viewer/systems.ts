import { SYSTEM_ORDER, type SystemId } from '@/lib/types';

import type { SystemMeta } from './types';

/**
 * Canonical system metadata for the 3D viewer.
 * Mirrors the spec in docs/CONTENT_SPEC.md so the viewer and the explorer stay usable even
 * while content JSON is still being generated. `src/viewer/catalog.ts` overlays authored
 * content from `@/data` when it is available.
 */
export const SYSTEM_META: Record<SystemId, SystemMeta> = {
  skeletal: {
    id: 'skeletal',
    name: 'Skeletal System',
    shortName: 'Skeletal',
    tagline: 'The living scaffold that holds you up.',
    color: '#8a6f45',
  },
  muscular: {
    id: 'muscular',
    name: 'Muscular System',
    shortName: 'Muscular',
    tagline: 'The engines that turn intention into motion.',
    color: '#b5523b',
  },
  nervous: {
    id: 'nervous',
    name: 'Nervous System',
    shortName: 'Nervous',
    tagline: 'The body’s electrical conversation.',
    color: '#c9973f',
  },
  cardiovascular: {
    id: 'cardiovascular',
    name: 'Cardiovascular System',
    shortName: 'Cardiovascular',
    tagline: 'The never-resting delivery network.',
    color: '#b23a4a',
  },
  respiratory: {
    id: 'respiratory',
    name: 'Respiratory System',
    shortName: 'Respiratory',
    tagline: 'Where breath becomes blood chemistry.',
    color: '#6a8f8b',
  },
  digestive: {
    id: 'digestive',
    name: 'Digestive System',
    shortName: 'Digestive',
    tagline: 'A long, patient chemical workshop.',
    color: '#9a6b3f',
  },
  endocrine: {
    id: 'endocrine',
    name: 'Endocrine System',
    shortName: 'Endocrine',
    tagline: 'Quiet glands that set the body’s tempo.',
    color: '#8a5a8f',
  },
  immune: {
    id: 'immune',
    name: 'Immune & Lymphatic System',
    shortName: 'Immune',
    tagline: 'The patrol that remembers every intruder.',
    color: '#6f8a4f',
  },
  urinary: {
    id: 'urinary',
    name: 'Urinary System',
    shortName: 'Urinary',
    tagline: 'The body’s precise filtration plant.',
    color: '#5c7a9e',
  },
  reproductive: {
    id: 'reproductive',
    name: 'Reproductive System',
    shortName: 'Reproductive',
    tagline: 'The systems that carry life forward.',
    color: '#a66a7a',
  },
  integumentary: {
    id: 'integumentary',
    name: 'Integumentary System',
    shortName: 'Integumentary',
    tagline: 'The living wrapper of skin, hair, and nail.',
    color: '#c99a76',
  },
  sensory: {
    id: 'sensory',
    name: 'Sensory Organs',
    shortName: 'Sensory',
    tagline: 'The windows through which the world arrives.',
    color: '#7a9bc4',
  },
};

export const SYSTEM_LIST = SYSTEM_ORDER.map((id) => SYSTEM_META[id]);

/** Number of organ representations the viewer draws for each system (matches the content spec). */
export const SYSTEM_ORGAN_COUNT: Record<SystemId, number> = {
  skeletal: 12,
  muscular: 10,
  nervous: 10,
  cardiovascular: 8,
  respiratory: 7,
  digestive: 10,
  endocrine: 6,
  immune: 6,
  urinary: 5,
  reproductive: 8,
  integumentary: 6,
  sensory: 7,
};
