#!/usr/bin/env node
/**
 * Anatomy Atlas — deterministic content validator.
 *
 * Single source of truth: docs/CONTENT_SPEC.md
 * Usage:
 *   node scripts/validate-content.mjs             # validate everything, exit 1 on failure
 *   node scripts/validate-content.mjs --json      # machine-readable summary (no table)
 *   node scripts/validate-content.mjs --urls      # also HTTP-check every source URL
 *   node scripts/validate-content.mjs --quiet     # only errors/warnings + result line
 *
 * Exit codes: 0 = all checks pass, 1 = at least one error (missing file, bad shape, bad value).
 * Warnings never fail the build but are printed and included in the report.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const SYSTEMS_DIR = join(DATA_DIR, 'systems');
const INDEX_TS = join(DATA_DIR, 'index.ts');

const ARGV = new Set(process.argv.slice(2));
const CHECK_URLS = ARGV.has('--urls');
const JSON_OUT = ARGV.has('--json');
const QUIET = ARGV.has('--quiet');

/* ------------------------------------------------------------------ */
/* Spec constants                                                     */
/* ------------------------------------------------------------------ */

/** System ids in canonical order, exact organ ids in exact order, spec colors. */
const SYSTEM_SPECS = [
  {
    id: 'skeletal',
    name: 'Skeletal System',
    color: '#8a6f45',
    organs: ['skull', 'mandible', 'vertebral-column', 'ribcage', 'sternum', 'pelvis', 'femur', 'humerus', 'radius-ulna', 'scapula', 'clavicle', 'patella'],
  },
  {
    id: 'muscular',
    name: 'Muscular System',
    color: '#b5523b',
    organs: ['deltoid', 'pectoralis-major', 'rectus-abdominis', 'trapezius', 'biceps-brachii', 'gluteus-maximus', 'quadriceps', 'hamstrings', 'gastrocnemius', 'diaphragm'],
  },
  {
    id: 'nervous',
    name: 'Nervous System',
    color: '#c9973f',
    organs: ['brain', 'cerebellum', 'brainstem', 'hypothalamus', 'hippocampus', 'amygdala', 'spinal-cord', 'peripheral-nerves', 'sciatic-nerve', 'meninges'],
  },
  {
    id: 'cardiovascular',
    name: 'Cardiovascular System',
    color: '#b23a4a',
    organs: ['heart', 'aorta', 'coronary-arteries', 'arteries', 'veins', 'capillaries', 'vena-cava', 'pulmonary-arteries'],
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
    organs: ['mouth', 'salivary-glands', 'esophagus', 'stomach', 'liver', 'gallbladder', 'pancreas', 'small-intestine', 'large-intestine', 'rectum'],
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
    organs: ['ovaries', 'fallopian-tubes', 'uterus', 'vagina', 'testes', 'prostate', 'penis', 'mammary-glands'],
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

const SYSTEM_IDS = SYSTEM_SPECS.map((s) => s.id);
const SYSTEM_BY_ID = new Map(SYSTEM_SPECS.map((s) => [s.id, s]));
const ALL_ORGAN_IDS = new Set(SYSTEM_SPECS.flatMap((s) => s.organs));
/** organ id -> owning system id, from the spec (works even when a system file is still being written). */
const EXPECTED_ORGAN_SYSTEM = new Map(SYSTEM_SPECS.flatMap((s) => s.organs.map((id) => [id, s.id])));

const BODY_REGIONS = ['head-neck', 'thorax', 'abdomen', 'pelvis', 'upper-limb', 'lower-limb', 'whole-body'];
const BODY_REGION_SET = new Set(BODY_REGIONS);

const LESSON_LEVELS = ['beginner', 'intermediate'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const DIFFICULTY_MIX = { easy: 3, medium: 3, hard: 2 };

/** Authoritative source domains from CONTENT_SPEC.md rule 7 (+ NIH family). */
const ALLOWED_SOURCE_DOMAINS = [
  'medlineplus.gov',
  'nih.gov',
  'cancer.gov',
  'ncbi.nlm.nih.gov',
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

/** Exports documented in docs/ARCHITECTURE.md that src/data/index.ts must provide. */
const REQUIRED_INDEX_EXPORTS = [
  'systems', 'systemsById', 'organs', 'organsById', 'lessons', 'lessonsById', 'siteStats',
  'glossary', 'facts', 'history', 'regions',
  'getSystem', 'getOrgan', 'getOrgansForSystem', 'getRelatedOrgans', 'getSystemForOrgan',
  'getLesson', 'searchOrgans',
];

/* ------------------------------------------------------------------ */
/* Reporting helpers                                                  */
/* ------------------------------------------------------------------ */

const errors = [];
const warnings = [];
const systemRecords = [];
const supplementaryRecords = [];

function error(ctx, msg) {
  errors.push({ ctx, msg });
}
function warning(ctx, msg) {
  warnings.push({ ctx, msg });
}
function countErrors(prefix) {
  return errors.filter((e) => e.ctx === prefix || e.ctx.startsWith(`${prefix}.`) || e.ctx.startsWith(`${prefix}[`)).length;
}
function countWarnings(prefix) {
  return warnings.filter((w) => w.ctx === prefix || w.ctx.startsWith(`${prefix}.`) || w.ctx.startsWith(`${prefix}[`)).length;
}

const typeName = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isString = (v) => typeof v === 'string';
const isNonEmptyString = (v) => isString(v) && v.trim().length > 0;
const words = (s) => (isNonEmptyString(s) ? s.trim().split(/\s+/).length : 0);
const chars = (s) => (isString(s) ? [...s].length : 0);
const paragraphs = (s) => (isString(s) ? s.trim().split(/\n\s*\n/).filter((p) => p.trim().length > 0).length : 0);
const sentences = (s) => (isString(s) ? (s.trim().match(/[.!?](?=\s|$)/g) || []).length : 0);
const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Check a string field. Returns the value when it is a string (even if other checks failed). */
function checkStr(ctx, value, opts = {}) {
  const {
    required = true,
    useWords = false,
    min = 1,
    max = Infinity,
    paraMin = null,
    paraMax = null,
    prose = true,
    allowPeriod = true,
    label = 'value',
  } = opts;

  if (value === undefined || value === null) {
    if (required) error(ctx, `missing required ${label}`);
    return undefined;
  }
  if (!isString(value)) {
    error(ctx, `expected string for ${label}, got ${typeName(value)}`);
    return undefined;
  }
  if (value.trim() === '') {
    error(ctx, `${label} is empty`);
    return value;
  }
  const len = useWords ? words(value) : chars(value);
  if (len < min) error(ctx, `${label} is too short: ${len} ${useWords ? 'words' : 'chars'}, needs >= ${min}`);
  if (max !== Infinity && len > max) error(ctx, `${label} is too long: ${len} ${useWords ? 'words' : 'chars'}, max ${max}`);
  if (paraMin !== null || paraMax !== null) {
    const p = paragraphs(value);
    if (paraMin !== null && p < paraMin) error(ctx, `${label} has ${p} paragraph(s), needs >= ${paraMin} (separate paragraphs with \\n\\n)`);
    if (paraMax !== null && p > paraMax) error(ctx, `${label} has ${p} paragraph(s), max ${paraMax}`);
  }
  if (!allowPeriod && /\.\s*$/.test(value.trim())) error(ctx, `${label} must not end with a period`);
  if (prose) checkProse(ctx, value);
  return value;
}

/* ------------------------------------------------------------------ */
/* Prose safety checks                                                */
/* ------------------------------------------------------------------ */

const MARKDOWN_PATTERNS = [
  { re: /!?\[[^\]]*\]\([^)]*\)/, msg: 'contains a markdown link/image' },
  { re: /\*\*|__|~~|`/, msg: 'contains markdown emphasis/code markers (*, _, ~, backtick)' },
  { re: /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s)/, msg: 'contains a markdown heading or list marker' },
  { re: /<\/?[a-z][a-z0-9-]*(\s[^>]*)?>/i, msg: 'contains an HTML tag' },
  { re: /[•◦▪▫■□●○‣∙]/, msg: 'contains a bullet character' },
  { re: /[*`#]/, msg: 'contains a markdown control character (*, `, #)' },
];
const EMOJI_RE = /[\p{Extended_Pictographic}\u{FE0F}]/u;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const TREATMENT_NOUNS =
  'mg|mcg|µg|μg|iu|puffs?|pills?|tablets?|capsules?|doses?|inhalers?|antibiotics?|medications?|medicines?|drugs?|supplements?|painkillers?|insulin|steroids?|vitamins?';
const ADVICE_ERROR_PATTERNS = [
  {
    // A dosage is only advice when paired with an instruction/regimen; "30 to 40 mg" as an organ weight is anatomy.
    re: new RegExp(
      `\\b(?:take|taking|took|prescrib(?:e|ed)|dose[d]?|inject(?:ed)?|inhale[d]?)\\b[^.]{0,40}\\b\\d+(?:[.,]\\d+)?\\s?(?:mg|mcg|µg|μg|iu)\\b`,
      'i',
    ),
    msg: 'instructs a dose (medical advice)',
  },
  {
    re: new RegExp(
      `\\b\\d+(?:[.,]\\d+)?\\s?(?:${TREATMENT_NOUNS})\\b[^.]{0,30}\\b(?:daily|per day|a day|twice|every \\d+ hours?|as needed)\\b`,
      'i',
    ),
    msg: 'gives a treatment regimen (medical advice)',
  },
  {
    re: new RegExp(
      `\\b(?:take|apply|use|swallow|inject|inhale|stop|start|avoid)\\s+(?:one|two|three|a|an|your|\\d[\\d.,]*)\\s*(?:${TREATMENT_NOUNS})\\b`,
      'i',
    ),
    msg: 'instructs the reader to take/use a treatment (medical advice)',
  },
  {
    re: /\byou (?:should|must|need to|have to)\s+(?:take|use|apply|stop|start|avoid|increase|reduce|switch)\b/i,
    msg: 'gives the reader a treatment instruction (medical advice)',
  },
  {
    re: /\b(?:see|consult|call|contact|talk to|ask)\s+(?:a|your|the)\s+(?:doctor|physician|clinician|pharmacist|healthcare provider|health professional)\b/i,
    msg: 'tells the reader to see a clinician (medical advice)',
  },
];
const ADVICE_WARNING_PATTERNS = [
  { re: /\bprescrib(?:e|ed|ing|tion)\b/i, msg: 'mentions prescription — keep strictly educational' },
  { re: /\bdiagnos(?:e|ed|is|tic)\b/i, msg: 'mentions diagnosis — keep strictly educational' },
  { re: /\bdosage\b/i, msg: 'mentions dosage — medical advice risk' },
  { re: /\byou (?:should|must|need to|have to)\b/i, msg: 'second-person instruction — check for medical advice' },
];

function checkProse(ctx, text) {
  if (!isString(text)) return;
  if (text !== text.trim()) warning(ctx, 'leading/trailing whitespace');
  for (const { re, msg } of MARKDOWN_PATTERNS) {
    if (re.test(text)) error(ctx, msg);
  }
  if (EMOJI_RE.test(text)) error(ctx, 'contains an emoji');
  if (CONTROL_RE.test(text)) error(ctx, 'contains a control character');
  for (const { re, msg } of ADVICE_ERROR_PATTERNS) {
    if (re.test(text)) error(ctx, msg);
  }
  for (const { re, msg } of ADVICE_WARNING_PATTERNS) {
    if (re.test(text)) warning(ctx, msg);
  }
}

/* ------------------------------------------------------------------ */
/* Sources                                                            */
/* ------------------------------------------------------------------ */

function hostIsAllowed(host) {
  return ALLOWED_SOURCE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

const collectedSourceUrls = new Map(); // url -> [{ctx}]

function checkSources(ctx, sources) {
  if (!Array.isArray(sources)) {
    error(ctx, `sources must be an array, got ${typeName(sources)}`);
    return;
  }
  if (sources.length !== 2) error(ctx, `sources must have exactly 2 entries, got ${sources.length}`);
  const seen = new Set();
  sources.forEach((src, i) => {
    const sctx = `${ctx}.sources[${i}]`;
    if (!isObject(src)) {
      error(sctx, `expected object, got ${typeName(src)}`);
      return;
    }
    checkStr(`${sctx}.label`, src.label, { max: 90, label: 'source label', prose: false });
    const url = src.url;
    if (!isString(url) || url.trim() === '') {
      error(`${sctx}.url`, 'missing source url');
      return;
    }
    if (url !== url.trim()) error(`${sctx}.url`, 'url has surrounding whitespace');
    if (seen.has(url)) error(`${sctx}.url`, `duplicate source url within organ: ${url}`);
    seen.add(url);
    if (!/^https:\/\//i.test(url)) {
      error(`${sctx}.url`, `source url must be https, got: ${url}`);
      return;
    }
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      error(`${sctx}.url`, `source url is not a valid URL: ${url}`);
      return;
    }
    if (parsed.username || parsed.password) error(`${sctx}.url`, 'source url must not contain credentials');
    if (!hostIsAllowed(parsed.hostname)) {
      error(`${sctx}.url`, `source host "${parsed.hostname}" is not on the authoritative allowlist (${ALLOWED_SOURCE_DOMAINS.join(', ')})`);
    }
    if (!collectedSourceUrls.has(url)) collectedSourceUrls.set(url, []);
    collectedSourceUrls.get(url).push(sctx);
  });
}

/* ------------------------------------------------------------------ */
/* Organ validation                                                   */
/* ------------------------------------------------------------------ */

function validateOrgan(organ, systemId, index) {
  const idHint = isObject(organ) && isString(organ.id) && organ.id.trim() ? organ.id : `#${index}`;
  const ctx = `${systemId}.organs[${index}] (${idHint})`;

  if (!isObject(organ)) {
    error(`${systemId}.organs[${index}]`, `expected object, got ${typeName(organ)}`);
    return;
  }

  const id = checkStr(`${ctx}.id`, organ.id, { label: 'organ id', prose: false, max: 60 });
  if (id !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) error(`${ctx}.id`, `organ id not kebab-case: "${id}"`);
  if (id !== undefined && !ALL_ORGAN_IDS.has(id)) error(`${ctx}.id`, `organ id "${id}" is not in the CONTENT_SPEC organ list`);

  if (organ.systemId !== systemId) {
    error(`${ctx}.systemId`, `expected "${systemId}", got ${JSON.stringify(organ.systemId)}`);
  }
  checkStr(`${ctx}.name`, organ.name, { max: 70, label: 'organ name' });
  if (organ.latin !== undefined) checkStr(`${ctx}.latin`, organ.latin, { max: 60, label: 'latin', prose: false });

  if (organ.alsoKnownAs !== undefined) {
    if (!Array.isArray(organ.alsoKnownAs)) {
      error(`${ctx}.alsoKnownAs`, `expected array, got ${typeName(organ.alsoKnownAs)}`);
    } else {
      if (organ.alsoKnownAs.length > 2) error(`${ctx}.alsoKnownAs`, `max 2 entries, got ${organ.alsoKnownAs.length}`);
      organ.alsoKnownAs.forEach((a, i) => checkStr(`${ctx}.alsoKnownAs[${i}]`, a, { max: 60, label: 'alsoKnownAs entry', prose: false }));
    }
  }

  if (organ.region === undefined) error(`${ctx}.region`, 'missing required region');
  else if (!BODY_REGION_SET.has(organ.region)) error(`${ctx}.region`, `invalid region "${organ.region}" (allowed: ${BODY_REGIONS.join(', ')})`);

  checkStr(`${ctx}.tagline`, organ.tagline, { max: 80, label: 'tagline', prose: false });
  checkStr(`${ctx}.summary`, organ.summary, {
    useWords: true,
    min: 110,
    max: 170,
    paraMin: 2,
    paraMax: 2,
    label: 'organ summary',
  });

  // functions: 3–5 objects, title + detail 12–40 words.
  if (!Array.isArray(organ.functions)) {
    error(`${ctx}.functions`, `expected array, got ${typeName(organ.functions)}`);
  } else {
    if (organ.functions.length < 3 || organ.functions.length > 5) {
      error(`${ctx}.functions`, `needs 3–5 functions, got ${organ.functions.length}`);
    }
    organ.functions.forEach((fn, i) => {
      const fctx = `${ctx}.functions[${i}]`;
      if (!isObject(fn)) {
        error(fctx, `expected object, got ${typeName(fn)}`);
        return;
      }
      checkStr(`${fctx}.title`, fn.title, { max: 60, label: 'function title' });
      checkStr(`${fctx}.detail`, fn.detail, { useWords: true, min: 12, max: 40, label: 'function detail' });
    });
  }

  checkStr(`${ctx}.location`, organ.location, { max: 260, label: 'location' });
  if (isNonEmptyString(organ.location) && sentences(organ.location) > 2) {
    warning(`${ctx}.location`, `should be one sentence, found ${sentences(organ.location)}`);
  }
  checkStr(`${ctx}.size`, organ.size, { max: 260, label: 'size' });
  if (isNonEmptyString(organ.size) && sentences(organ.size) > 2) {
    warning(`${ctx}.size`, `should be one sentence, found ${sentences(organ.size)}`);
  }

  // facts: exactly 3.
  if (!Array.isArray(organ.facts)) {
    error(`${ctx}.facts`, `expected array, got ${typeName(organ.facts)}`);
  } else {
    if (organ.facts.length !== 3) error(`${ctx}.facts`, `needs exactly 3 facts, got ${organ.facts.length}`);
    organ.facts.forEach((f, i) => {
      checkStr(`${ctx}.facts[${i}]`, f, { max: 320, label: 'fact' });
      if (isNonEmptyString(f) && sentences(f) > 2) warning(`${ctx}.facts[${i}]`, 'fact is long; keep it to 1–2 sentences');
    });
  }

  // conditions: 2–3 objects, educational only.
  if (!Array.isArray(organ.conditions)) {
    error(`${ctx}.conditions`, `expected array, got ${typeName(organ.conditions)}`);
  } else {
    if (organ.conditions.length < 2 || organ.conditions.length > 3) {
      error(`${ctx}.conditions`, `needs 2–3 conditions, got ${organ.conditions.length}`);
    }
    organ.conditions.forEach((c, i) => {
      const cctx = `${ctx}.conditions[${i}]`;
      if (!isObject(c)) {
        error(cctx, `expected object, got ${typeName(c)}`);
        return;
      }
      checkStr(`${cctx}.name`, c.name, { max: 80, label: 'condition name' });
      checkStr(`${cctx}.description`, c.description, { useWords: true, min: 6, max: 60, label: 'condition description' });
    });
  }

  // relatedOrgans: 2–4 existing organ ids, no self-reference.
  if (!Array.isArray(organ.relatedOrgans)) {
    error(`${ctx}.relatedOrgans`, `expected array, got ${typeName(organ.relatedOrgans)}`);
  } else {
    if (organ.relatedOrgans.length < 2 || organ.relatedOrgans.length > 4) {
      error(`${ctx}.relatedOrgans`, `needs 2–4 entries, got ${organ.relatedOrgans.length}`);
    }
    const seen = new Set();
    organ.relatedOrgans.forEach((rel, i) => {
      const rctx = `${ctx}.relatedOrgans[${i}]`;
      if (!isString(rel)) {
        error(rctx, `expected string, got ${typeName(rel)}`);
        return;
      }
      if (!ALL_ORGAN_IDS.has(rel)) error(rctx, `"${rel}" is not a known organ id in CONTENT_SPEC.md`);
      if (isString(id) && rel === id) error(rctx, 'organ cannot relate to itself');
      if (seen.has(rel)) error(rctx, `duplicate related organ "${rel}"`);
      seen.add(rel);
    });
  }

  // keywords: 3–6 lowercase search terms.
  if (!Array.isArray(organ.keywords)) {
    error(`${ctx}.keywords`, `expected array, got ${typeName(organ.keywords)}`);
  } else {
    if (organ.keywords.length < 3 || organ.keywords.length > 6) {
      error(`${ctx}.keywords`, `needs 3–6 keywords, got ${organ.keywords.length}`);
    }
    organ.keywords.forEach((k, i) => {
      const kctx = `${ctx}.keywords[${i}]`;
      if (!isString(k)) {
        error(kctx, `expected string, got ${typeName(k)}`);
        return;
      }
      if (!k.trim()) error(kctx, 'empty keyword');
      else if (k !== k.toLowerCase()) error(kctx, `keyword must be lowercase: "${k}"`);
      if (chars(k) > 40) warning(kctx, `keyword is long (${chars(k)} chars)`);
    });
  }

  checkSources(`${ctx}.sources`, organ.sources);

  if (organ.heroStat !== undefined) {
    const hctx = `${ctx}.heroStat`;
    if (!isObject(organ.heroStat)) {
      error(hctx, `expected object, got ${typeName(organ.heroStat)}`);
    } else {
      checkStr(`${hctx}.value`, organ.heroStat.value, { max: 12, label: 'heroStat value', prose: false });
      checkStr(`${hctx}.label`, organ.heroStat.label, { max: 24, label: 'heroStat label', prose: false });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Lesson + quiz validation                                           */
/* ------------------------------------------------------------------ */

function validateLesson(lesson, systemId, systemOrganIds) {
  const ctx = `${systemId}.lesson`;
  if (!isObject(lesson)) {
    error(ctx, `expected object, got ${typeName(lesson)}`);
    return { steps: 0, organSteps: 0 };
  }

  const expectedId = `lesson-${systemId}`;
  if (lesson.id !== expectedId) error(`${ctx}.id`, `expected "${expectedId}", got ${JSON.stringify(lesson.id)}`);
  checkStr(`${ctx}.title`, lesson.title, { max: 120, label: 'lesson title' });
  checkStr(`${ctx}.subtitle`, lesson.subtitle, { max: 90, label: 'lesson subtitle' });

  if (lesson.durationMin === undefined) error(`${ctx}.durationMin`, 'missing durationMin');
  else if (!Number.isInteger(lesson.durationMin) || lesson.durationMin < 6 || lesson.durationMin > 12) {
    error(`${ctx}.durationMin`, `must be an integer 6–12, got ${JSON.stringify(lesson.durationMin)}`);
  }
  if (lesson.level === undefined) error(`${ctx}.level`, 'missing level');
  else if (!LESSON_LEVELS.includes(lesson.level)) error(`${ctx}.level`, `must be beginner or intermediate, got ${JSON.stringify(lesson.level)}`);

  let steps = 0;
  let organSteps = 0;
  if (!Array.isArray(lesson.steps)) {
    error(`${ctx}.steps`, `expected array, got ${typeName(lesson.steps)}`);
    return { steps, organSteps };
  }
  steps = lesson.steps.length;
  if (steps !== 8) error(`${ctx}.steps`, `needs exactly 8 steps, got ${steps}`);

  lesson.steps.forEach((step, i) => {
    const sctx = `${ctx}.steps[${i}]`;
    if (!isObject(step)) {
      error(sctx, `expected object, got ${typeName(step)}`);
      return;
    }
    const title = checkStr(`${sctx}.title`, step.title, { useWords: true, min: 2, max: 6, label: 'step title', prose: false });
    if (isString(title) && /[.!?]\s*$/.test(title.trim())) warning(`${sctx}.title`, 'step title should not end with punctuation');
    checkStr(`${sctx}.body`, step.body, { useWords: true, min: 90, max: 140, label: 'step body' });
    if (step.keyPoint !== undefined) {
      checkStr(`${sctx}.keyPoint`, step.keyPoint, { max: 110, label: 'keyPoint', prose: false });
    }
    if (step.organId !== undefined) {
      if (!isString(step.organId)) {
        error(`${sctx}.organId`, `expected string, got ${typeName(step.organId)}`);
      } else if (!systemOrganIds.has(step.organId)) {
        error(`${sctx}.organId`, `"${step.organId}" is not an organ in the ${systemId} system`);
      } else {
        organSteps += 1;
      }
    }
    // Structural guidance from the spec (warnings; the hard requirement is >= 5 organ steps below).
    if (i === 0 && step.organId !== undefined) warning(`${sctx}.organId`, 'step 1 is the hook and should not link an organ');
    if (i > 0 && i < steps - 1 && step.organId === undefined) warning(`${sctx}.organId`, 'steps 2–7 should each link an organ');
    if (i === steps - 1 && step.organId !== undefined) warning(`${sctx}.organId`, 'final step is the recap and should not link an organ');
  });

  if (organSteps < 5) error(`${ctx}.steps`, `needs >= 5 steps with a valid organId, got ${organSteps}`);
  return { steps, organSteps };
}

function validateQuiz(quiz, systemId) {
  const ctx = `${systemId}.quiz`;
  if (!Array.isArray(quiz)) {
    error(ctx, `expected array, got ${typeName(quiz)}`);
    return { count: 0, mix: {} };
  }
  if (quiz.length !== 8) error(ctx, `needs exactly 8 quiz questions, got ${quiz.length}`);

  const mix = { easy: 0, medium: 0, hard: 0 };
  const answerIndexes = [];
  const questionTexts = new Set();

  quiz.forEach((q, i) => {
    const qctx = `${ctx}[${i}]`;
    if (!isObject(q)) {
      error(qctx, `expected object, got ${typeName(q)}`);
      return;
    }
    const expectedId = `${systemId}-q${i + 1}`;
    if (q.id !== expectedId) error(`${qctx}.id`, `expected "${expectedId}", got ${JSON.stringify(q.id)}`);
    if (q.systemId !== systemId) error(`${qctx}.systemId`, `expected "${systemId}", got ${JSON.stringify(q.systemId)}`);

    const question = checkStr(`${qctx}.question`, q.question, { max: 220, label: 'question' });
    if (isNonEmptyString(q.question)) {
      const norm = q.question.toLowerCase().trim();
      if (questionTexts.has(norm)) error(`${qctx}.question`, 'duplicate question text in this quiz');
      questionTexts.add(norm);
    }

    if (!Array.isArray(q.options)) {
      error(`${qctx}.options`, `expected array, got ${typeName(q.options)}`);
    } else {
      if (q.options.length !== 4) error(`${qctx}.options`, `needs exactly 4 options, got ${q.options.length}`);
      const seen = new Set();
      q.options.forEach((opt, oi) => {
        const octx = `${qctx}.options[${oi}]`;
        if (!isString(opt)) {
          error(octx, `expected string, got ${typeName(opt)}`);
          return;
        }
        if (!opt.trim()) error(octx, 'empty option');
        if (chars(opt) > 120) warning(octx, `option is long (${chars(opt)} chars)`);
        const norm = opt.trim().toLowerCase();
        if (seen.has(norm)) error(octx, `duplicate option "${opt}"`);
        seen.add(norm);
        checkProse(octx, opt);
      });
      const joined = q.options.filter(isString).join(' ');
      if (/\b(all|none) of the above\b/i.test(joined)) error(`${qctx}.options`, 'options must not contain "all/none of the above"');
    }

    if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) {
      error(`${qctx}.answerIndex`, `must be an integer 0–3, got ${JSON.stringify(q.answerIndex)}`);
    } else {
      answerIndexes.push(q.answerIndex);
    }

    checkStr(`${qctx}.explanation`, q.explanation, { useWords: true, min: 20, max: 50, label: 'explanation' });

    if (!DIFFICULTIES.includes(q.difficulty)) {
      error(`${qctx}.difficulty`, `must be easy, medium or hard, got ${JSON.stringify(q.difficulty)}`);
    } else {
      mix[q.difficulty] += 1;
    }
  });

  for (const level of DIFFICULTIES) {
    if (quiz.length === 8 && mix[level] !== DIFFICULTY_MIX[level]) {
      error(ctx, `difficulty mix must be 3 easy, 3 medium, 2 hard; got ${mix.easy} easy, ${mix.medium} medium, ${mix.hard} hard`);
      break;
    }
  }
  if (answerIndexes.length === 8 && new Set(answerIndexes).size < 3) {
    warning(ctx, `correct answer positions barely vary (${[...new Set(answerIndexes)].sort().join(', ')}); spec asks to vary them`);
  }
  return { count: quiz.length, mix };
}

/* ------------------------------------------------------------------ */
/* System validation                                                  */
/* ------------------------------------------------------------------ */

function validateSystem(data, expected, file) {
  const ctx = expected.id;
  const record = {
    id: expected.id,
    file,
    present: true,
    organs: 0,
    steps: 0,
    organSteps: 0,
    quiz: 0,
    mix: { easy: 0, medium: 0, hard: 0 },
    errors: 0,
    warnings: 0,
  };

  if (!isObject(data)) {
    error(ctx, `top-level JSON must be an object, got ${typeName(data)}`);
    record.errors = countErrors(ctx);
    return record;
  }

  if (data.id !== expected.id) error(`${ctx}.id`, `expected "${expected.id}", got ${JSON.stringify(data.id)}`);
  if (data.name !== expected.name) warning(`${ctx}.name`, `expected display name "${expected.name}", got ${JSON.stringify(data.name)}`);
  checkStr(`${ctx}.name`, data.name, { max: 60, label: 'system name' });
  if (isNonEmptyString(data.shortName)) {
    const n = data.shortName.trim().split(/\s+/).length;
    if (n < 1 || n > 2) error(`${ctx}.shortName`, `must be 1–2 words, got ${n}: "${data.shortName}"`);
  }
  checkStr(`${ctx}.shortName`, data.shortName, { max: 30, label: 'shortName', prose: false });
  checkStr(`${ctx}.tagline`, data.tagline, { max: 70, label: 'tagline', prose: false });
  checkStr(`${ctx}.summary`, data.summary, { useWords: true, min: 180, max: 240, paraMin: 2, paraMax: 3, label: 'system summary' });

  if (isString(data.color)) {
    if (!/^#[0-9a-fA-F]{6}$/.test(data.color)) error(`${ctx}.color`, `invalid hex color "${data.color}"`);
    else if (data.color.toLowerCase() !== expected.color) {
      error(`${ctx}.color`, `must match CONTENT_SPEC color ${expected.color}, got ${data.color}`);
    }
  } else {
    error(`${ctx}.color`, 'missing or non-string color');
  }

  // stats: exactly 3 {value,label}, no trailing periods.
  if (!Array.isArray(data.stats)) {
    error(`${ctx}.stats`, `expected array, got ${typeName(data.stats)}`);
  } else {
    if (data.stats.length !== 3) error(`${ctx}.stats`, `needs exactly 3 stats, got ${data.stats.length}`);
    data.stats.forEach((st, i) => {
      const sctx = `${ctx}.stats[${i}]`;
      if (!isObject(st)) {
        error(sctx, `expected object, got ${typeName(st)}`);
        return;
      }
      checkStr(`${sctx}.value`, st.value, { max: 20, label: 'stat value', prose: false, allowPeriod: false });
      checkStr(`${sctx}.label`, st.label, { max: 40, label: 'stat label', prose: false, allowPeriod: false });
      if (isString(st.value) && st.value.trim().endsWith('.')) error(`${sctx}.value`, 'must not end with a period');
      if (isString(st.label) && st.label.trim().endsWith('.')) error(`${sctx}.label`, 'must not end with a period');
    });
  }

  // functions: 4–6 short strings.
  if (!Array.isArray(data.functions)) {
    error(`${ctx}.functions`, `expected array, got ${typeName(data.functions)}`);
  } else {
    if (data.functions.length < 4 || data.functions.length > 6) {
      error(`${ctx}.functions`, `needs 4–6 functions, got ${data.functions.length}`);
    }
    data.functions.forEach((fn, i) => checkStr(`${ctx}.functions[${i}]`, fn, { max: 95, label: 'system function' }));
  }

  // organs: exact ids in exact order.
  if (!Array.isArray(data.organs)) {
    error(`${ctx}.organs`, `expected array, got ${typeName(data.organs)}`);
  } else {
    record.organs = data.organs.length;
    if (data.organs.length < 5 || data.organs.length > 12) {
      error(`${ctx}.organs`, `needs 5–12 organs, got ${data.organs.length}`);
    }
    const gotIds = data.organs.map((o, i) => (isObject(o) && isString(o.id) ? o.id : `<missing-id at index ${i}>`));
    const expectedIds = expected.organs;
    if (gotIds.join(',') !== expectedIds.join(',')) {
      const missing = expectedIds.filter((id) => !gotIds.includes(id));
      const extra = gotIds.filter((id) => !expectedIds.includes(id));
      let detail = `organ ids/order must exactly match CONTENT_SPEC`;
      if (missing.length) detail += `; missing: ${missing.join(', ')}`;
      if (extra.length) detail += `; unexpected: ${extra.join(', ')}`;
      if (!missing.length && !extra.length) detail += '; order differs';
      error(`${ctx}.organs`, detail);
      // Identify first mismatch for the report.
      for (let i = 0; i < Math.max(gotIds.length, expectedIds.length); i += 1) {
        if (gotIds[i] !== expectedIds[i]) {
          detail = `first mismatch at index ${i}: expected "${expectedIds[i] ?? '<none>'}", got "${gotIds[i] ?? '<none>'}"`;
          error(`${ctx}.organs`, detail);
          break;
        }
      }
    }
    data.organs.forEach((organ, i) => validateOrgan(organ, expected.id, i));
  }

  const systemOrganIds = new Set(
    Array.isArray(data.organs) ? data.organs.filter(isObject).map((o) => o.id).filter(isString) : [],
  );
  const lessonInfo = validateLesson(data.lesson, expected.id, systemOrganIds);
  record.steps = lessonInfo.steps;
  record.organSteps = lessonInfo.organSteps;

  const quizInfo = validateQuiz(data.quiz, expected.id);
  record.quiz = quizInfo.count;
  record.mix = quizInfo.mix;

  record.errors = countErrors(ctx);
  record.warnings = countWarnings(ctx);
  return record;
}

/* ------------------------------------------------------------------ */
/* Supplementary data                                                 */
/* ------------------------------------------------------------------ */

function loadJson(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) {
    error(relPath, `missing file: ${relPath}`);
    return { missing: true };
  }
  try {
    return { data: JSON.parse(readFileSync(abs, 'utf8')) };
  } catch (e) {
    error(relPath, `invalid JSON: ${e.message}`);
    return { parseError: true };
  }
}

function validateGlossary(glossary) {
  const ctx = 'glossary';
  const record = { count: 0, errors: 0, warnings: 0, present: true };
  if (!Array.isArray(glossary)) {
    error(ctx, `must be an array of GlossaryTerm, got ${typeName(glossary)}`);
    record.errors = countErrors(ctx);
    return record;
  }
  record.count = glossary.length;
  if (glossary.length === 0) error(ctx, 'glossary is empty');
  else if (glossary.length < 30) warning(ctx, `only ${glossary.length} terms; aim for broad coverage`);

  const termSeen = new Map(); // lowercase term -> index
  const termsSet = new Set(); // normalized terms for cross-refs
  const categories = new Set();
  const pendingRelated = [];

  glossary.forEach((entry, i) => {
    const ectx = `${ctx}[${i}]`;
    if (!isObject(entry)) {
      error(ectx, `expected object, got ${typeName(entry)}`);
      return;
    }
    const term = checkStr(`${ectx}.term`, entry.term, { max: 80, label: 'term' });
    checkStr(`${ectx}.definition`, entry.definition, { useWords: true, min: 8, max: 80, label: 'definition' });
    checkStr(`${ectx}.category`, entry.category, { max: 40, label: 'category', prose: false });
    if (isNonEmptyString(term)) {
      const key = term.trim().toLowerCase();
      if (termSeen.has(key)) error(`${ectx}.term`, `duplicate glossary term "${term}" (first at index ${termSeen.get(key)})`);
      else termSeen.set(key, i);
      termsSet.add(key);
      termsSet.add(slug(term));
    }
    if (entry.systemId !== undefined && !SYSTEM_IDS.includes(entry.systemId)) {
      error(`${ectx}.systemId`, `invalid systemId ${JSON.stringify(entry.systemId)}`);
    }
    if (entry.related !== undefined) {
      if (!Array.isArray(entry.related)) error(`${ectx}.related`, `expected array, got ${typeName(entry.related)}`);
      else entry.related.forEach((rel, ri) => {
        if (!isString(rel)) {
          error(`${ectx}.related[${ri}]`, `expected string, got ${typeName(rel)}`);
          return;
        }
        pendingRelated.push({ ctx: `${ectx}.related[${ri}]`, ref: rel });
      });
    }
    if (isNonEmptyString(entry.category)) categories.add(entry.category.trim());
  });

  // Resolve cross-references against glossary terms + organ ids.
  for (const { ctx: rctx, ref } of pendingRelated) {
    const k = ref.trim().toLowerCase();
    if (!termsSet.has(k) && !termsSet.has(slug(ref)) && !ALL_ORGAN_IDS.has(ref) && !SYSTEM_IDS.includes(ref)) {
      error(rctx, `unresolved related reference "${ref}" (not a glossary term, organ id, or system id)`);
    }
  }

  if (glossary.length > 0) {
    const duplicateTerms = [...termSeen.entries()].length;
    if (duplicateTerms !== glossary.length) {
      // already reported per-entry; keep a summary line for the report
    }
  }
  record.categories = [...categories].sort();
  record.errors = countErrors(ctx);
  record.warnings = countWarnings(ctx);
  return record;
}

function validateFacts(facts) {
  const ctx = 'facts';
  const record = { count: 0, errors: 0, warnings: 0, present: true };
  if (!Array.isArray(facts)) {
    error(ctx, `must be an array of Fact, got ${typeName(facts)}`);
    record.errors = countErrors(ctx);
    return record;
  }
  record.count = facts.length;
  if (facts.length === 0) error(ctx, 'facts is empty');
  else if (facts.length < 12) warning(ctx, `only ${facts.length} facts; aim for at least one per system`);

  const ids = new Set();
  const texts = new Set();
  facts.forEach((fact, i) => {
    const fctx = `${ctx}[${i}]`;
    if (!isObject(fact)) {
      error(fctx, `expected object, got ${typeName(fact)}`);
      return;
    }
    const id = checkStr(`${fctx}.id`, fact.id, { max: 80, label: 'fact id', prose: false });
    if (isNonEmptyString(id)) {
      if (ids.has(id)) error(`${fctx}.id`, `duplicate fact id "${id}"`);
      ids.add(id);
    }
    const text = checkStr(`${fctx}.text`, fact.text, { max: 260, label: 'fact text' });
    if (isNonEmptyString(text)) {
      const norm = text.trim().toLowerCase();
      if (texts.has(norm)) error(`${fctx}.text`, 'duplicate fact text');
      texts.add(norm);
    }
    if (fact.systemId !== undefined && !SYSTEM_IDS.includes(fact.systemId)) {
      error(`${fctx}.systemId`, `invalid systemId ${JSON.stringify(fact.systemId)}`);
    }
    if (fact.organId !== undefined) {
      if (!isString(fact.organId)) {
        error(`${fctx}.organId`, `expected string, got ${typeName(fact.organId)}`);
      } else if (!ALL_ORGAN_IDS.has(fact.organId)) {
        error(`${fctx}.organId`, `unknown organ id "${fact.organId}"`);
      } else if (fact.systemId !== undefined && EXPECTED_ORGAN_SYSTEM.get(fact.organId) !== fact.systemId) {
        error(`${fctx}.systemId`, `systemId "${fact.systemId}" disagrees with organ "${fact.organId}" (${EXPECTED_ORGAN_SYSTEM.get(fact.organId)})`);
      }
    }
    if (fact.systemId === undefined && fact.organId === undefined) {
      warning(fctx, 'fact has neither systemId nor organId; it cannot be filtered in the UI');
    }
  });
  record.errors = countErrors(ctx);
  record.warnings = countWarnings(ctx);
  return record;
}

function validateHistory(history) {
  const ctx = 'history';
  const record = { count: 0, errors: 0, warnings: 0, present: true };
  if (!Array.isArray(history)) {
    error(ctx, `must be an array of HistoryEvent, got ${typeName(history)}`);
    record.errors = countErrors(ctx);
    return record;
  }
  record.count = history.length;
  if (history.length === 0) error(ctx, 'history is empty');
  else if (history.length < 6) warning(ctx, `only ${history.length} events; aim for a richer timeline`);

  const seen = new Set();
  history.forEach((event, i) => {
    const ectx = `${ctx}[${i}]`;
    if (!isObject(event)) {
      error(ectx, `expected object, got ${typeName(event)}`);
      return;
    }
    const year = checkStr(`${ectx}.year`, event.year, { max: 24, label: 'year', prose: false });
    if (isNonEmptyString(event.year) && !/^(?:c\.|ca\.)?\s?\d{1,4}(?:\s?(?:BCE|BC|CE|AD))?(?:\s?[–-]\s?\d{1,4}(?:\s?(?:BCE|BC|CE|AD))?)?$/.test(event.year.trim())) {
      warning(`${ectx}.year`, `unusual year format "${event.year}" (expected e.g. "1628", "300 BCE", "1895–1901")`);
    }
    checkStr(`${ectx}.title`, event.title, { max: 120, label: 'title' });
    checkStr(`${ectx}.description`, event.description, { useWords: true, min: 15, max: 120, label: 'description' });
    if (event.figure !== undefined) checkStr(`${ectx}.figure`, event.figure, { max: 80, label: 'figure', prose: false });
    if (isNonEmptyString(year) && isNonEmptyString(event.title)) {
      const key = `${year}|${event.title.trim().toLowerCase()}`;
      if (seen.has(key)) error(`${ectx}.title`, `duplicate history event "${event.title}" (${year})`);
      seen.add(key);
    }
  });
  record.errors = countErrors(ctx);
  record.warnings = countWarnings(ctx);
  return record;
}

function validateRegions(regions) {
  const ctx = 'regions';
  const record = { count: 0, errors: 0, warnings: 0, present: true };
  if (!Array.isArray(regions)) {
    error(ctx, `must be an array of RegionInfo, got ${typeName(regions)}`);
    record.errors = countErrors(ctx);
    return record;
  }
  record.count = regions.length;
  if (regions.length !== BODY_REGIONS.length) {
    error(ctx, `needs exactly ${BODY_REGIONS.length} regions, got ${regions.length}`);
  }
  const ids = new Set();
  regions.forEach((region, i) => {
    const rctx = `${ctx}[${i}]`;
    if (!isObject(region)) {
      error(rctx, `expected object, got ${typeName(region)}`);
      return;
    }
    if (!BODY_REGION_SET.has(region.id)) {
      error(`${rctx}.id`, `invalid region id ${JSON.stringify(region.id)} (allowed: ${BODY_REGIONS.join(', ')})`);
    } else {
      if (ids.has(region.id)) error(`${rctx}.id`, `duplicate region id "${region.id}"`);
      ids.add(region.id);
    }
    checkStr(`${rctx}.name`, region.name, { max: 40, label: 'region name', prose: false });
    checkStr(`${rctx}.tagline`, region.tagline, { max: 90, label: 'region tagline', prose: false });
    const description = checkStr(`${rctx}.description`, region.description, { useWords: true, min: 25, max: 220, label: 'region description' });
    if (isNonEmptyString(description)) {
      const p = paragraphs(description);
      if (p > 2) warning(`${rctx}.description`, `has ${p} paragraphs; keep to 1–2`);
      if (words(description) > 180) warning(`${rctx}.description`, `long for a region blurb (${words(description)} words)`);
    }
    if (!Array.isArray(region.landmarks)) {
      error(`${rctx}.landmarks`, `expected array, got ${typeName(region.landmarks)}`);
    } else {
      if (region.landmarks.length < 3 || region.landmarks.length > 8) {
        error(`${rctx}.landmarks`, `needs 3–8 landmarks, got ${region.landmarks.length}`);
      }
      const seen = new Set();
      region.landmarks.forEach((lm, li) => {
        const lctx = `${rctx}.landmarks[${li}]`;
        if (!isString(lm) || !lm.trim()) {
          error(lctx, 'landmark must be a non-empty string');
          return;
        }
        if (seen.has(lm.trim().toLowerCase())) error(lctx, `duplicate landmark "${lm}"`);
        seen.add(lm.trim().toLowerCase());
      });
    }
  });
  for (const id of BODY_REGIONS) {
    if (!ids.has(id)) error(ctx, `missing region "${id}"`);
  }
  record.errors = countErrors(ctx);
  record.warnings = countWarnings(ctx);
  return record;
}

/* ------------------------------------------------------------------ */
/* src/data/index.ts contract check                                   */
/* ------------------------------------------------------------------ */

function validateDataIndex() {
  const ctx = 'src/data/index.ts';
  const record = { pass: true, missing: [] };
  if (!existsSync(INDEX_TS)) {
    error(ctx, 'index.ts is missing');
    record.pass = false;
    return record;
  }
  const src = readFileSync(INDEX_TS, 'utf8');
  const exported = new Set();
  const reExport = /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = reExport.exec(src)) !== null) exported.add(m[1]);
  const reList = /export\s*\{([^}]+)\}/g;
  while ((m = reList.exec(src)) !== null) {
    m[1].split(',').forEach((piece) => {
      const name = piece.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) exported.add(name);
    });
  }
  for (const name of REQUIRED_INDEX_EXPORTS) {
    if (!exported.has(name)) {
      error(ctx, `missing documented export "${name}" (see docs/ARCHITECTURE.md data contract)`);
      record.missing.push(name);
      record.pass = false;
    }
  }
  return record;
}

/* ------------------------------------------------------------------ */
/* Optional URL check                                                 */
/* ------------------------------------------------------------------ */

async function checkSourceUrls() {
  const urls = [...collectedSourceUrls.keys()];
  if (!urls.length) return { checked: 0, failures: [] };
  const failures = [];
  const results = new Map();
  let index = 0;
  const concurrency = 8;

  async function fetchOnce(url) {
    const attempt = async (method) => {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: { 'user-agent': 'AnatomyAtlasContentValidator/1.0 (+educational content check)' },
      });
      return res;
    };
    let res;
    try {
      res = await attempt('HEAD');
      if (res.status === 405 || res.status === 403 || res.status === 501) res = await attempt('GET');
    } catch {
      res = await attempt('GET');
    }
    return res;
  }

  async function worker() {
    while (index < urls.length) {
      const url = urls[index];
      index += 1;
      try {
        const res = await fetchOnce(url);
        results.set(url, res.status);
      } catch (e) {
        results.set(url, `ERR ${e.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, () => worker()));

  for (const [url, status] of results) {
    if (status !== 200) {
      const contexts = collectedSourceUrls.get(url) || [];
      failures.push({ url, status, contexts });
      for (const c of contexts) warning(c, `source URL did not return HTTP 200 (${status}): ${url}`);
    }
  }
  return { checked: urls.length, failures };
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  const started = Date.now();

  // 1. Load system files.
  let files = [];
  if (!existsSync(SYSTEMS_DIR)) {
    error('src/data/systems', 'systems directory is missing');
  } else {
    files = readdirSync(SYSTEMS_DIR).filter((f) => f.endsWith('.json')).sort();
  }
  const presentIds = files.map((f) => f.replace(/\.json$/, ''));
  const expectedSet = new Set(SYSTEM_IDS);
  const missingSystems = SYSTEM_IDS.filter((id) => !presentIds.includes(id));
  const extraSystems = presentIds.filter((id) => !expectedSet.has(id));
  for (const id of missingSystems) error(id, `missing system file src/data/systems/${id}.json`);
  for (const id of extraSystems) error(id, `unexpected system file src/data/systems/${id}.json (no such system in CONTENT_SPEC.md)`);

  const parsedSystems = new Map();
  const organSystemMap = new Map();
  for (const file of files) {
    const rel = `src/data/systems/${file}`;
    const systemId = file.replace(/\.json$/, '');
    const expected = SYSTEM_BY_ID.get(systemId);
    let text;
    try {
      text = readFileSync(join(SYSTEMS_DIR, file), 'utf8');
    } catch (e) {
      error(systemId, `cannot read ${rel}: ${e.message}`);
      continue;
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      error(systemId, `invalid JSON in ${rel}: ${e.message}`);
      systemRecords.push({
        id: systemId, file: rel, present: true, organs: 0, steps: 0, organSteps: 0, quiz: 0,
        mix: { easy: 0, medium: 0, hard: 0 }, errors: countErrors(systemId), warnings: countWarnings(systemId), parseError: true,
      });
      continue;
    }
    parsedSystems.set(systemId, data);
    if (!expected) {
      // Unexpected file: still validate shape coarsely so the report is useful.
      systemRecords.push({
        id: systemId, file: rel, present: true, organs: Array.isArray(data?.organs) ? data.organs.length : 0,
        steps: Array.isArray(data?.lesson?.steps) ? data.lesson.steps.length : 0, organSteps: 0,
        quiz: Array.isArray(data?.quiz) ? data.quiz.length : 0, mix: { easy: 0, medium: 0, hard: 0 },
        errors: countErrors(systemId), warnings: countWarnings(systemId),
      });
      continue;
    }
    const record = validateSystem(data, expected, rel);
    systemRecords.push(record);
    if (isObject(data) && Array.isArray(data.organs)) {
      for (const organ of data.organs) {
        if (isObject(organ) && isString(organ.id) && !organSystemMap.has(organ.id)) organSystemMap.set(organ.id, systemId);
      }
    }
  }

  // 2. Global organ-id uniqueness.
  const organOccurrences = new Map(); // id -> [systemId...]
  for (const [systemId, data] of parsedSystems) {
    if (!isObject(data) || !Array.isArray(data.organs)) continue;
    for (const organ of data.organs) {
      if (!isObject(organ) || !isString(organ.id)) continue;
      if (!organOccurrences.has(organ.id)) organOccurrences.set(organ.id, []);
      organOccurrences.get(organ.id).push(systemId);
    }
  }
  for (const [organId, systemIds] of organOccurrences) {
    if (systemIds.length > 1) {
      error('organs', `duplicate global organ id "${organId}" appears in: ${systemIds.join(', ')}`);
    }
  }
  for (const requiredOrganId of ALL_ORGAN_IDS) {
    if (!organOccurrences.has(requiredOrganId)) {
      error('organs', `required organ id "${requiredOrganId}" never appears in any system (see CONTENT_SPEC.md)`);
    }
  }

  // 3. Supplementary files.
  const glossaryRes = loadJson('src/data/glossary.json');
  const glossary = 'data' in glossaryRes ? glossaryRes.data : undefined;
  const factsRes = loadJson('src/data/facts.json');
  const facts = 'data' in factsRes ? factsRes.data : undefined;
  const historyRes = loadJson('src/data/history.json');
  const history = 'data' in historyRes ? historyRes.data : undefined;
  const regionsRes = loadJson('src/data/regions.json');
  const regions = 'data' in regionsRes ? regionsRes.data : undefined;

  supplementaryRecords.push({ key: 'glossary', ...validateGlossary(glossary) });
  supplementaryRecords.push({ key: 'facts', ...validateFacts(facts) });
  supplementaryRecords.push({ key: 'history', ...validateHistory(history) });
  supplementaryRecords.push({ key: 'regions', ...validateRegions(regions) });

  // 4. Data API contract.
  const indexRecord = validateDataIndex();

  // 5. Optional live URL checks.
  let urlCheck = { checked: 0, failures: [] };
  if (CHECK_URLS) urlCheck = await checkSourceUrls();

  // 6. Report.
  const ok = errors.length === 0;

  if (JSON_OUT) {
    const summary = {
      ok,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      counts: {
        systemsPresent: presentIds.length,
        systemsExpected: SYSTEM_IDS.length,
        organs: [...organOccurrences.keys()].length,
        sources: collectedSourceUrls.size,
      },
      systems: systemRecords,
      missingSystems,
      extraSystems,
      supplementary: supplementaryRecords,
      dataIndex: indexRecord,
      urlCheck: CHECK_URLS ? urlCheck : null,
      errors,
      warnings,
    };
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = ok ? 0 : 1;
    return;
  }

  const line = (s = '') => process.stdout.write(`${s}\n`);
  line('');
  line('Anatomy Atlas — content validation');
  line(`Spec: docs/CONTENT_SPEC.md · Root: ${ROOT}`);
  line('');

  if (!QUIET) {
    line(`Systems (${presentIds.length}/${SYSTEM_IDS.length} files present)`);
    line('  status  id              organs  lesson(steps/organ)  quiz  easy/med/hard   issues');
    line('  ------  --------------  ------  -------------------  ----  --------------  ------');
    for (const spec of SYSTEM_SPECS) {
      const rec = systemRecords.find((r) => r.id === spec.id);
      if (!rec) {
        line(`  MISSING ${spec.id.padEnd(14)}  -       -                    -     -               missing file`);
        continue;
      }
      const status = rec.errors > 0 ? 'FAIL  ' : rec.parseError ? 'FAIL  ' : 'pass  ';
      const mix = `${rec.mix.easy}/${rec.mix.medium}/${rec.mix.hard}`;
      line(
        `  ${status}  ${spec.id.padEnd(14)}  ${String(rec.organs).padStart(6)}  ` +
          `${String(rec.steps).padStart(7)}/${String(rec.organSteps).padEnd(6)}  ${String(rec.quiz).padStart(4)}  ` +
          `${mix.padEnd(14)}  ${rec.errors} err / ${rec.warnings} warn`,
      );
    }
    line('');
    line('Supplementary data');
    for (const rec of supplementaryRecords) {
      const status = rec.errors > 0 ? 'FAIL' : 'pass';
      line(`  ${status}  ${rec.key.padEnd(9)}  ${String(rec.count).padStart(3)} entries  ${rec.errors} err / ${rec.warnings} warn`);
    }
    line(`  ${indexRecord.pass ? 'pass' : 'FAIL'}  data API   ${REQUIRED_INDEX_EXPORTS.length - indexRecord.missing.length}/${REQUIRED_INDEX_EXPORTS.length} documented exports`);
    line('');
  }

  if (errors.length) {
    line(`Errors (${errors.length}):`);
    const shown = errors.slice(0, 120);
    for (const e of shown) line(`  ✗ [${e.ctx}] ${e.msg}`);
    if (errors.length > shown.length) line(`  … ${errors.length - shown.length} more errors (use --json for the full list)`);
    line('');
  } else {
    line('Errors: none');
    line('');
  }

  if (warnings.length) {
    line(`Warnings (${warnings.length}):`);
    const shownWarnings = warnings.slice(0, QUIET ? 0 : 80);
    for (const w of shownWarnings) line(`  ! [${w.ctx}] ${w.msg}`);
    if (warnings.length > shownWarnings.length) line(`  … ${warnings.length - shownWarnings.length} more warnings (use --json for the full list)`);
    line('');
  }

  if (CHECK_URLS) {
    line(`Source URL check: ${urlCheck.checked} unique URLs, ${urlCheck.failures.length} not HTTP 200`);
    for (const f of urlCheck.failures.slice(0, 40)) line(`  ✗ ${f.status} ${f.url}`);
    line('');
  } else if (!QUIET) {
    line(`Source URLs: ${collectedSourceUrls.size} unique; run with --urls to HTTP-check them.`);
    line('');
  }

  line(
    `Result: ${ok ? 'PASS' : 'FAIL'} — ${presentIds.length}/${SYSTEM_IDS.length} systems, ` +
      `${errors.length} error(s), ${warnings.length} warning(s), ${Date.now() - started} ms`,
  );
  line('');

  process.exitCode = ok ? 0 : 1;
}

main().catch((e) => {
  console.error('Validator crashed:', e);
  process.exitCode = 2;
});
