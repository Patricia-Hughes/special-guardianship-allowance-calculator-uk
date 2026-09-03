/**
 * Reference data access.
 *
 * [R10] Rate data is never hardcoded in engine source. It lives in versioned
 * JSON under /data with an effective date, copied into this package at build
 * time by scripts/sync-engine-data.ts, which also strips the maintainer-only
 * fields so they are not shipped to a browser.
 *
 * The `with { type: 'json' }` on each import is required, not decorative. Node
 * refuses a JSON import in an ES module without it, so the built package threw
 * ERR_IMPORT_ATTRIBUTE_MISSING the moment anything loaded it outside a bundler,
 * despite package.json advertising `exports` and `main`. Next and vitest both
 * accept the attribute, so it costs nothing and makes the published shape
 * honest. Do not strip them.
 */

import benefits202526 from './data/benefits.2025-26.json' with { type: 'json' };
import benefits202627 from './data/benefits.2026-27.json' with { type: 'json' };
import citationsJson from './data/citations.json' with { type: 'json' };
import kinshipZonesJson from './data/kinship-zones.json' with { type: 'json' };
import laOverridesJson from './data/la-overrides.json' with { type: 'json' };
import laRegionMapJson from './data/la-region-map.json' with { type: 'json' };
import rates202425 from './data/rates.2024-25.json' with { type: 'json' };
import rates202526 from './data/rates.2025-26.json' with { type: 'json' };
import rates202627 from './data/rates.2026-27.json' with { type: 'json' };

import { DataError } from './errors.js';
import type {
  BenefitTable,
  Citation,
  EnglandRegion,
  IsoDate,
  KinshipZones,
  LaOverride,
  RateTable,
} from './types.js';

export const ENGINE_VERSION = '0.1.0';

// ─── Tables, newest first ──────────────────────────────────────────────────

export const RATE_TABLES: RateTable[] = [
  rates202627 as unknown as RateTable,
  rates202526 as unknown as RateTable,
  rates202425 as unknown as RateTable,
];

export const BENEFIT_TABLES: BenefitTable[] = [
  benefits202627 as unknown as BenefitTable,
  benefits202526 as unknown as BenefitTable,
];

export const KINSHIP_ZONES = kinshipZonesJson as unknown as KinshipZones;

// ─── Councils ──────────────────────────────────────────────────────────────

/**
 * All seeded LA overrides, including those not yet publishable. Use
 * publishableLaOverride for anything that reaches a user.
 */
export const LA_OVERRIDES_ALL: Record<string, LaOverride> = Object.fromEntries(
  (laOverridesJson.authorities as unknown as LaOverride[]).map((a) => [a.slug, a]),
);

/**
 * [HARD R9] Any statement about a NAMED council must be backed by a stored,
 * dated, live source URL. An entry without one is invisible to the engine: the
 * calculation falls back to national minimums and raises COUNCIL_POLICY_UNKNOWN,
 * which is an honest gap rather than an unsourced claim about a real body.
 */
export function isPublishable(la: LaOverride | undefined): la is LaOverride {
  if (!la || !la.publishable || !la.policySourceUrl) return false;
  const finding = la.lawfulnessFlag;
  if (finding && (!finding.sourceUrl || !finding.decisionDate)) return false;
  return true;
}

/** Resolve a publishable override from a given override map. */
export function publishableLaOverrideIn(
  overrides: Record<string, LaOverride>,
  slug: string | undefined,
): LaOverride | undefined {
  if (!slug) return undefined;
  const la = overrides[slug];
  return isPublishable(la) ? la : undefined;
}

/** Convenience over the shipped override set. */
export function publishableLaOverride(slug: string | undefined): LaOverride | undefined {
  return publishableLaOverrideIn(LA_OVERRIDES_ALL, slug);
}

/** True when we hold a seeded-but-unpublishable entry for this council. */
export function hasUnpublishableLaOverrideIn(
  overrides: Record<string, LaOverride>,
  slug: string | undefined,
): boolean {
  if (!slug) return false;
  const la = overrides[slug];
  return la !== undefined && !isPublishable(la);
}

export function hasUnpublishableLaOverride(slug: string | undefined): boolean {
  return hasUnpublishableLaOverrideIn(LA_OVERRIDES_ALL, slug);
}

// ─── Regions ───────────────────────────────────────────────────────────────

export const LA_REGION_MAP = laRegionMapJson.map as Record<string, EnglandRegion>;
export const LA_NAMES = laRegionMapJson.names as Record<string, string>;

/**
 * verificationNote and knownDiscrepancies are maintainer prose and are stripped
 * from the shipped copy by sync-engine-data. They live in /data if you want the
 * reasoning; what the browser needs is the short statement of what the mapping
 * rests on, which is regionSource.
 */
export const LA_REGION_MAP_META = {
  verificationStatus: laRegionMapJson.verificationStatus,
  /** What the mapping actually rests on. The DfE publishes no authority-level list. */
  regionSource: laRegionMapJson.regionSource,
  expectedAuthorityCount: laRegionMapJson.expectedAuthorityCount,
};

// ─── Citations ─────────────────────────────────────────────────────────────

type RawCitation = Omit<Citation, 'id' | 'retrieved'> & { retrieved: string };
const CITATIONS = citationsJson as unknown as Record<string, RawCitation>;

/** Resolve a citation id to a full Citation. Throws on an unknown id [R3]. */
export function cite(id: string): Citation {
  const citation = CITATIONS[id];
  if (!citation) throw new DataError(`Unknown citation id: "${id}"`);
  return { id, ...citation, retrieved: citation.retrieved as IsoDate };
}

export function allCitationIds(): string[] {
  return Object.keys(CITATIONS);
}
