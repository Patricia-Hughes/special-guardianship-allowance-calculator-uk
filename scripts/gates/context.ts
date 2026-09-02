/**
 * What every gate is given, loaded once.
 *
 * Reading and parsing /data happens here rather than in each gate, so a gate is
 * a function of the data rather than a script that goes and finds its own, and
 * adding one does not mean adding another pass over the filesystem.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA_DIR = join(ROOT, 'data');
export const SCHEMA_DIR = join(DATA_DIR, 'schema');

export const NATIONS = ['england', 'wales', 'northern-ireland', 'scotland'] as const;

// ─── The data ──────────────────────────────────────────────────────────────

export interface AgeBand {
  id: string;
  minAge: number;
  maxAge: number;
}

export interface AnomalySource {
  source?: string;
  url?: string;
  date?: string;
  finding?: string;
}

export interface RateSection {
  ageBands: AgeBand[];
  regions?: Record<string, Record<string, number>>;
  rates?: Record<string, number>;
  sourceId?: string;
  verify?: boolean;
  verifyNote?: string;
  anomalyConfirmed?: boolean;
  anomalyCorroboration?: AnomalySource[];
  userFacingNote?: string;
}

export interface RateDoc {
  financialYear: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: string;
  pendingSourceIssue?: string;
  [k: string]: unknown;
}

export interface LaEntry {
  slug: string;
  name: string;
  publishable: boolean;
  corePolicy?: string;
  policySourceUrl: string;
  pendingSourceIssue?: string;
  verifiedOn: string;
  lawfulnessFlag?: { sourceUrl: string; decisionDate: string } | null;
  fixedPercentageOfFosteringRate?: number | null;
  livingCostsMultiplierPercent?: number;
  region?: string;
  [k: string]: unknown;
}

/** Every (nation, region) rate set in a document, flattened for checking. */
export interface RateSet {
  label: string;
  nation: string;
  bands: AgeBand[];
  rates: Record<string, number>;
  /** Marked in the data as known-suspect and awaiting confirmation. */
  unverified: boolean;
  /** Suspect-looking, but corroborated as genuinely published. */
  anomalyConfirmed: boolean;
}

export function rateSets(doc: RateDoc): RateSet[] {
  const out: RateSet[] = [];
  for (const nation of NATIONS) {
    const section = doc[nation] as RateSection | null | undefined;
    if (!section) continue;
    const common = {
      nation,
      bands: section.ageBands,
      unverified: section.verify === true,
      anomalyConfirmed: section.anomalyConfirmed === true,
    };
    if (section.regions) {
      for (const [region, rates] of Object.entries(section.regions)) {
        out.push({ ...common, label: `${nation}/${region}`, rates });
      }
    } else if (section.rates) {
      out.push({ ...common, label: nation, rates: section.rates });
    }
  }
  return out;
}

// ─── Reporting ─────────────────────────────────────────────────────────────

/**
 * A gate records rather than throws, so one run reports everything wrong at
 * once. Fixing data files one CI run at a time is miserable and slow.
 */
export class Report {
  readonly failures: string[] = [];
  readonly notes: string[] = [];

  fail(check: string, message: string): void {
    this.failures.push(`[${check}] ${message}`);
  }

  note(message: string): void {
    this.notes.push(message);
  }
}

// ─── Context ───────────────────────────────────────────────────────────────

export const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;

export interface GateContext {
  report: Report;
  /** Every *.json in /data, by filename. */
  dataFiles: string[];
  /** The parsed contents of each, by filename. */
  docs: Map<string, Record<string, unknown>>;
  /** The rate tables only, by filename. */
  rateDocs: Map<string, RateDoc>;
  citationIds: Set<string>;
  authorities: LaEntry[];
  regionMap: Record<string, string>;
  regionNames: Record<string, string>;
  expectedAuthorityCount: number;
  kinshipZoneSlugs: string[];
  /** Source files read as text, for the gates that check code against data. */
  sourceOf: (...segments: string[]) => string;
}

export function loadContext(): GateContext {
  const report = new Report();
  const dataFiles = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));

  const docs = new Map<string, Record<string, unknown>>();
  for (const file of dataFiles) docs.set(file, readJson(join(DATA_DIR, file)));

  const rateDocs = new Map<string, RateDoc>();
  for (const file of dataFiles) {
    if (file.startsWith('rates.')) rateDocs.set(file, docs.get(file) as unknown as RateDoc);
  }

  const regionMapDoc = docs.get('la-region-map.json') ?? {};
  const overridesDoc = docs.get('la-overrides.json') ?? {};
  const zonesDoc = docs.get('kinship-zones.json') ?? {};

  return {
    report,
    dataFiles,
    docs,
    rateDocs,
    citationIds: new Set(Object.keys(docs.get('citations.json') ?? {})),
    authorities: (overridesDoc.authorities ?? []) as LaEntry[],
    regionMap: (regionMapDoc.map ?? {}) as Record<string, string>,
    regionNames: (regionMapDoc.names ?? {}) as Record<string, string>,
    expectedAuthorityCount: regionMapDoc.expectedAuthorityCount as number,
    kinshipZoneSlugs: (zonesDoc.localAuthorities ?? []) as string[],
    sourceOf: (...segments) => readFileSync(join(ROOT, ...segments), 'utf8'),
  };
}

/** Walk a tree for files with these extensions, skipping build output. */
export function walk(dir: string, exts: string[], acc: string[] = []): string[] {
  const skip = new Set(['node_modules', '.next', 'dist', '.git', '.turbo', 'out']);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, acc);
    else if (exts.some((e) => entry.name.endsWith(e))) acc.push(full);
  }
  return acc;
}

/** Visit every object in a parsed document, with a JSON-ish path to each. */
export function visit(
  value: unknown,
  path: string,
  fn: (obj: Record<string, unknown>, path: string) => void,
): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => visit(v, `${path}[${i}]`, fn));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const obj = value as Record<string, unknown>;
  fn(obj, path);
  for (const [k, v] of Object.entries(obj)) visit(v, `${path}.${k}`, fn);
}
