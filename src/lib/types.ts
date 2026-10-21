/** Shared domain types for Anatomy Atlas. Content is authored as JSON and typed here. */

export type SystemId =
  | 'skeletal'
  | 'muscular'
  | 'nervous'
  | 'cardiovascular'
  | 'respiratory'
  | 'digestive'
  | 'endocrine'
  | 'immune'
  | 'urinary'
  | 'reproductive'
  | 'integumentary'
  | 'sensory';

export const SYSTEM_ORDER: SystemId[] = [
  'skeletal',
  'muscular',
  'nervous',
  'cardiovascular',
  'respiratory',
  'digestive',
  'endocrine',
  'immune',
  'urinary',
  'reproductive',
  'integumentary',
  'sensory',
];

export type BodyRegion =
  | 'head-neck'
  | 'thorax'
  | 'abdomen'
  | 'pelvis'
  | 'upper-limb'
  | 'lower-limb'
  | 'whole-body';

export const BODY_REGIONS: { id: BodyRegion; name: string }[] = [
  { id: 'head-neck', name: 'Head & Neck' },
  { id: 'thorax', name: 'Chest & Thorax' },
  { id: 'abdomen', name: 'Abdomen' },
  { id: 'pelvis', name: 'Pelvis' },
  { id: 'upper-limb', name: 'Upper Limbs' },
  { id: 'lower-limb', name: 'Lower Limbs' },
  { id: 'whole-body', name: 'Whole Body' },
];

export interface OrganFunction {
  title: string;
  detail: string;
}

export interface OrganCondition {
  name: string;
  description: string;
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface Organ {
  id: string;
  systemId: SystemId;
  name: string;
  latin?: string;
  alsoKnownAs?: string[];
  region: BodyRegion;
  tagline: string;
  summary: string;
  functions: OrganFunction[];
  location: string;
  size: string;
  facts: string[];
  conditions: OrganCondition[];
  relatedOrgans: string[];
  keywords: string[];
  sources: SourceLink[];
  heroStat?: HeroStat;
}

export interface LessonStep {
  title: string;
  body: string;
  organId?: string;
  keyPoint?: string;
}

export type LessonLevel = 'beginner' | 'intermediate';

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  durationMin: number;
  level: LessonLevel;
  steps: LessonStep[];
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: string;
  systemId: SystemId;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: Difficulty;
}

export interface AnatomySystem {
  id: SystemId;
  name: string;
  shortName: string;
  tagline: string;
  summary: string;
  color: string;
  stats: HeroStat[];
  functions: string[];
  organs: Organ[];
  lesson: Lesson;
  quiz: QuizQuestion[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  category: string;
  systemId?: SystemId;
  related?: string[];
}

export interface Fact {
  id: string;
  text: string;
  systemId?: SystemId;
  organId?: string;
}

export interface HistoryEvent {
  year: string;
  title: string;
  description: string;
  figure?: string;
}

export interface RegionInfo {
  id: BodyRegion;
  name: string;
  tagline: string;
  description: string;
  landmarks: string[];
}

/** A lightweight reference used in related-content rails. */
export interface OrganRef {
  id: string;
  name: string;
  systemId: SystemId;
  tagline: string;
}
