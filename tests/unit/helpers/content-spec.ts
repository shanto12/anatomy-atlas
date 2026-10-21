/**
 * Canonical facts about the required content, transcribed from
 * docs/CONTENT_SPEC.md. Tests treat this as the single source of truth:
 * if the spec changes, this file changes with it.
 */
import type { BodyRegion, SystemId } from '@/lib/types';

export interface SystemSpec {
  id: SystemId;
  name: string;
  color: string;
  organs: string[];
}

export const SYSTEM_SPECS: SystemSpec[] = [
  {
    id: 'skeletal',
    name: 'Skeletal System',
    color: '#8a6f45',
    organs: [
      'skull',
      'mandible',
      'vertebral-column',
      'ribcage',
      'sternum',
      'pelvis',
      'femur',
      'humerus',
      'radius-ulna',
      'scapula',
      'clavicle',
      'patella',
    ],
  },
  {
    id: 'muscular',
    name: 'Muscular System',
    color: '#b5523b',
    organs: [
      'deltoid',
      'pectoralis-major',
      'rectus-abdominis',
      'trapezius',
      'biceps-brachii',
      'gluteus-maximus',
      'quadriceps',
      'hamstrings',
      'gastrocnemius',
      'diaphragm',
    ],
  },
  {
    id: 'nervous',
    name: 'Nervous System',
    color: '#c9973f',
    organs: [
      'brain',
      'cerebellum',
      'brainstem',
      'hypothalamus',
      'hippocampus',
      'amygdala',
      'spinal-cord',
      'peripheral-nerves',
      'sciatic-nerve',
      'meninges',
    ],
  },
  {
    id: 'cardiovascular',
    name: 'Cardiovascular System',
    color: '#b23a4a',
    organs: [
      'heart',
      'aorta',
      'coronary-arteries',
      'arteries',
      'veins',
      'capillaries',
      'vena-cava',
      'pulmonary-arteries',
    ],
  },
  {
    id: 'respiratory',
    name: 'Respiratory System',
    color: '#6a8f8b',
    organs: ['lungs', 'trachea', 'bronchi', 'bronchioles', 'alveoli', 'larynx', 'pleura'],
  },
  {
    id: 'digestive',
    name: 'Digestive System',
    color: '#9a6b3f',
    organs: [
      'mouth',
      'salivary-glands',
      'esophagus',
      'stomach',
      'liver',
      'gallbladder',
      'pancreas',
      'small-intestine',
      'large-intestine',
      'rectum',
    ],
  },
  {
    id: 'endocrine',
    name: 'Endocrine System',
    color: '#8a5a8f',
    organs: ['pituitary-gland', 'thyroid', 'parathyroid', 'adrenal-glands', 'pineal-gland', 'pancreatic-islets'],
  },
  {
    id: 'immune',
    name: 'Immune & Lymphatic System',
    color: '#6f8a4f',
    organs: ['thymus', 'spleen', 'lymph-nodes', 'tonsils', 'bone-marrow', 'lymphatic-vessels'],
  },
  {
    id: 'urinary',
    name: 'Urinary System',
    color: '#5c7a9e',
    organs: ['kidneys', 'ureters', 'bladder', 'urethra', 'nephrons'],
  },
  {
    id: 'reproductive',
    name: 'Reproductive System',
    color: '#a66a7a',
    organs: [
      'ovaries',
      'fallopian-tubes',
      'uterus',
      'vagina',
      'testes',
      'prostate',
      'penis',
      'mammary-glands',
    ],
  },
  {
    id: 'integumentary',
    name: 'Integumentary System',
    color: '#c99a76',
    organs: ['skin', 'hair', 'nails', 'sweat-glands', 'sebaceous-glands', 'subcutaneous-fat'],
  },
  {
    id: 'sensory',
    name: 'Sensory Organs',
    color: '#7a9bc4',
    organs: ['eyes', 'ears', 'nose', 'tongue', 'retina', 'cochlea', 'vestibular-system'],
  },
];

/** Every globally-unique organ id required by the content spec. */
export const ALL_ORGAN_IDS = SYSTEM_SPECS.flatMap((s) => s.organs);

export const BODY_REGION_IDS: BodyRegion[] = [
  'head-neck',
  'thorax',
  'abdomen',
  'pelvis',
  'upper-limb',
  'lower-limb',
  'whole-body',
];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

/** Allowlisted source domains from docs/CONTENT_SPEC.md rule 7. */
export const SOURCE_DOMAIN_ALLOWLIST = [
  'medlineplus.gov',
  'nih.gov',
  'clevelandclinic.org',
  'mayoclinic.org',
  'britannica.com',
  'kenhub.com',
  'teachmeanatomy.info',
  'hopkinsmedicine.org',
  'yalemedicine.org',
  'cdc.gov',
  'who.int',
];

export function isAllowedSourceHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return SOURCE_DOMAIN_ALLOWLIST.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/** Count whitespace-separated words in authored prose. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Count paragraphs separated by a blank line, as required by the spec. */
export function paragraphCount(text: string): number {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length;
}

export const SYSTEM_IDS = SYSTEM_SPECS.map((s) => s.id);

export const ORGAN_SPEC_BY_ID = new Map(
  SYSTEM_SPECS.flatMap((system) => system.organs.map((organId) => [organId, system.id] as const)),
);
