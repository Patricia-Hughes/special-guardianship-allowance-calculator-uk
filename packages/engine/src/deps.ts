/**
 * The reference data the engine calculates against.
 *
 * The engine is a pure function of (input, data). Data is injectable so the
 * legal test cases in spec §35 can exercise paths the SHIPPED data deliberately
 * blocks: the means test, whose Income Support amounts are PENDING_SOURCE, and
 * LA overrides whose source URLs are not yet re-sourced. Injecting for a test
 * never loosens the shipped defaults and never lets a legal test be skipped.
 *
 * Production callers pass nothing and get the versioned files under /data.
 */

import {
  BENEFIT_TABLES,
  KINSHIP_ZONES,
  LA_OVERRIDES_ALL,
  RATE_TABLES,
} from './referenceData.js';
import type { BenefitTable, KinshipZones, LaOverride, RateTable } from './types.js';

export interface EngineDeps {
  rateTables: RateTable[];
  benefitTables: BenefitTable[];
  laOverrides: Record<string, LaOverride>;
  kinshipZones: KinshipZones;
}

export function defaultDeps(): EngineDeps {
  return {
    rateTables: RATE_TABLES,
    benefitTables: BENEFIT_TABLES,
    laOverrides: LA_OVERRIDES_ALL,
    kinshipZones: KINSHIP_ZONES,
  };
}

export function resolveDeps(partial?: Partial<EngineDeps>): EngineDeps {
  return { ...defaultDeps(), ...partial };
}
