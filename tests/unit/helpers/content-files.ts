/**
 * Raw filesystem access to authored content.
 *
 * Tests read JSON from disk (rather than importing `@/data`) so that a
 * single corrupt or missing file is reported as a focused failure instead
 * of aborting the whole test file at import time. Content is generated in
 * parallel, so every read is defensive.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { SYSTEM_SPECS, type SystemSpec } from './content-spec';

export const PROJECT_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const DATA_DIR = path.join(PROJECT_ROOT, 'src', 'data');
export const SYSTEMS_DIR = path.join(DATA_DIR, 'systems');

export interface LoadedSystem {
  spec: SystemSpec;
  file: string;
  exists: boolean;
  /** Parsed JSON, or undefined when the file is missing/invalid. */
  data?: any;
  /** Human-readable parse error, if any. */
  error?: string;
}

function parseJson(file: string): { data?: any; error?: string } {
  try {
    return { data: JSON.parse(readFileSync(file, 'utf8')) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** Load one system by id from disk. Never throws. */
export function loadSystem(spec: SystemSpec): LoadedSystem {
  const file = path.join(SYSTEMS_DIR, `${spec.id}.json`);
  if (!existsSync(file)) return { spec, file, exists: false };
  const { data, error } = parseJson(file);
  return { spec, file, exists: true, data, error };
}

/** Load every required system from disk, in canonical order. Never throws. */
export function loadSystems(): LoadedSystem[] {
  return SYSTEM_SPECS.map(loadSystem);
}

/** Systems whose JSON parsed successfully. */
export function loadParsedSystems(): Required<Pick<LoadedSystem, 'spec' | 'file' | 'data'>>[] {
  return loadSystems().filter(
    (s): s is LoadedSystem & { data: any } => Boolean(s.data) && typeof s.data === 'object',
  );
}

export function listSystemFiles(): string[] {
  if (!existsSync(SYSTEMS_DIR)) return [];
  return readdirSync(SYSTEMS_DIR).filter((f) => f.endsWith('.json'));
}

export type SupplementaryName = 'glossary' | 'facts' | 'history' | 'regions';

export interface LoadedSupplementary {
  name: SupplementaryName;
  file: string;
  exists: boolean;
  data?: any;
  error?: string;
}

export function loadSupplementary(name: SupplementaryName): LoadedSupplementary {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!existsSync(file)) return { name, file, exists: false };
  const { data, error } = parseJson(file);
  return { name, file, exists: true, data, error };
}

/** Concatenate every authored prose string in a system file for hygiene checks. */
export function collectSystemStrings(system: any): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const push = (where: string, value: unknown) => {
    if (typeof value === 'string') out.push({ where, text: value });
  };
  push('name', system?.name);
  push('shortName', system?.shortName);
  push('tagline', system?.tagline);
  push('summary', system?.summary);
  (system?.functions ?? []).forEach((f: unknown, i: number) => push(`functions[${i}]`, f));
  for (const organ of system?.organs ?? []) {
    push(`organ ${organ?.id} name`, organ?.name);
    push(`organ ${organ?.id} tagline`, organ?.tagline);
    push(`organ ${organ?.id} summary`, organ?.summary);
    push(`organ ${organ?.id} location`, organ?.location);
    push(`organ ${organ?.id} size`, organ?.size);
    (organ?.functions ?? []).forEach((fn: any, i: number) => {
      push(`organ ${organ?.id} functions[${i}].title`, fn?.title);
      push(`organ ${organ?.id} functions[${i}].detail`, fn?.detail);
    });
    (organ?.facts ?? []).forEach((fact: unknown, i: number) => push(`organ ${organ?.id} facts[${i}]`, fact));
    (organ?.conditions ?? []).forEach((c: any, i: number) => {
      push(`organ ${organ?.id} conditions[${i}].name`, c?.name);
      push(`organ ${organ?.id} conditions[${i}].description`, c?.description);
    });
    (organ?.keywords ?? []).forEach((k: unknown, i: number) => push(`organ ${organ?.id} keywords[${i}]`, k));
  }
  (system?.lesson?.steps ?? []).forEach((step: any, i: number) => {
    push(`lesson steps[${i}].title`, step?.title);
    push(`lesson steps[${i}].body`, step?.body);
    push(`lesson steps[${i}].keyPoint`, step?.keyPoint);
  });
  (system?.quiz ?? []).forEach((q: any, i: number) => {
    push(`quiz[${i}].question`, q?.question);
    push(`quiz[${i}].explanation`, q?.explanation);
    (q?.options ?? []).forEach((o: unknown, j: number) => push(`quiz[${i}].options[${j}]`, o));
  });
  return out;
}

export function collectSupplementaryStrings(name: SupplementaryName, data: any): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  if (name === 'glossary') {
    (data ?? []).forEach((term: any, i: number) => {
      out.push({ where: `glossary[${i}].term`, text: term?.term });
      out.push({ where: `glossary[${i}].definition`, text: term?.definition });
      out.push({ where: `glossary[${i}].category`, text: term?.category });
    });
  } else if (name === 'facts') {
    (data ?? []).forEach((fact: any, i: number) => out.push({ where: `facts[${i}].text`, text: fact?.text }));
  } else if (name === 'history') {
    (data ?? []).forEach((event: any, i: number) => {
      out.push({ where: `history[${i}].title`, text: event?.title });
      out.push({ where: `history[${i}].description`, text: event?.description });
    });
  } else if (name === 'regions') {
    (data ?? []).forEach((region: any, i: number) => {
      out.push({ where: `regions[${i}].name`, text: region?.name });
      out.push({ where: `regions[${i}].tagline`, text: region?.tagline });
      out.push({ where: `regions[${i}].description`, text: region?.description });
      (region?.landmarks ?? []).forEach((landmark: unknown, j: number) =>
        out.push({ where: `regions[${i}].landmarks[${j}]`, text: landmark }),
      );
    });
  }
  return out;
}
