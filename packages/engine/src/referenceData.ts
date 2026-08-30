/**
 * Reference data access. [R10] Rate data is never hardcoded in engine source —
 * it lives in versioned JSON under /data with an effective date, copied into
 * this package at build time by scripts/sync-engine-data.ts.
 */

import rates202627 from './data/rates.2026-27.json' ;
import rates202526 from './data/rates.2025-26.json';
import rates202425 from './data/rates.2024-25.json';
import benefits202627 from './data/benefits.2026-27.json';
import benefits202526 from './data/benefits.2025-26.json';
import citationsJson from './data/citations.json';
import kinshipZonesJson from './data/kinship-zones.json';
import laOverridesJson from './data/la-overrides.json';
import laRegionMapJson from './data/la-region-map.json';

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

type RawCitation = Omit<Citation, 'id' | 'retrieved'> & { retrieved: string };
const CITATIONS = citationsJson as unknown as Record<string, RawCitation>;

/**
 * All seeded LA overrides, including those not yet publishable.
 * Use `publishableLaOverride()` for anything that reaches a user.
 */
export const LA_OVERRIDES_ALL: Record<string, LaOverride> = Object.fromEntries(
  (laOverridesJson.authorities as unknown as LaOverride[]).map((a) => [a.slug, a]),
);

/**
 * [HARD R9] Any statement about a NAMED council must be backed by a stored,
 * dated, live source URL. An entry without one is invisible to the engine: the
 * calculation falls back to national minimums and raises COUNCIL_POLICY_UNKNOWN.
 */
export function isPublishable(la: LaOverride | undefined): la is LaOverride {
  if (!la) return false;
  if (!la.publishable) return false;
  if (!la.policySourceUrl) return false;
  if (la.lawfulnessFlag && (!la.lawfulnessFlag.sourceUrl || !la.lawfulnessFlag.decisionDate)) {
    return false;
  }
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

export const LA_REGION_MAP = laRegionMapJson.map as Record<string, EnglandRegion>;
export const LA_NAMES = laRegionMapJson.names as Record<string, string>;
export const LA_REGION_MAP_META = {
  verificationStatus: laRegionMapJson.verificationStatus,
  verificationNote: laRegionMapJson.verificationNote,
  knownDiscrepancies: laRegionMapJson.knownDiscrepancies,
  expectedAuthorityCount: laRegionMapJson.expectedAuthorityCount,
};

/** Resolve a citation id to a full Citation. Throws on an unknown id [R3]. */
export function cite(id: string): Citation {
  const c = CITATIONS[id];
  if (!c) throw new DataError(`Unknown citation id: "${id}"`);
  return { id, ...c, retrieved: c.retrieved as IsoDate };
}

export function allCitationIds(): string[] {
  return Object.keys(CITATIONS);
}

export const ENGINE_VERSION = '0.1.0';
