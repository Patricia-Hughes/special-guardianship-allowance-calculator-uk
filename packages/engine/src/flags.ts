/**
 * Assembling and ordering the warnings, spec §17.
 *
 * The warnings themselves are in flagCatalogue.ts. This file decides which one
 * is shown first, and turns a code plus some context into a Flag the result
 * page can render.
 */

import { FLAG_CATALOGUE } from './flagCatalogue.js';
import type { FlagContext } from './flagTypes.js';
import { cite } from './referenceData.js';
import type { Flag, FlagCode, FlagSeverity } from './types.js';

export { FLAG_CATALOGUE };
export type { FlagContext, FlagSpec } from './flagTypes.js';

/**
 * Ordering within a severity follows this array, which is roughly descending by
 * financial impact (spec §17).
 */
const FLAG_ORDER: FlagCode[] = [
  'UNLAWFUL_CB_DEDUCTION_RISK',
  'FIXED_PERCENTAGE_POLICY',
  'BELOW_NMA',
  'LGSCO_FINDING_AGAINST_LA',
  'LGSCO_FINDING_FORMER_POLICY',
  'RATES_STALE',
  'REG7_FLOOR_APPLIED',
  'REG7_EXPIRING',
  'REG7_EXTENSION_AVAILABLE',
  'REG7_MISAPPLICATION_WARNING',
  'NOT_LOOKED_AFTER_BEFORE_ORDER',
  'KINSHIP_ZONE_ELIGIBLE',
  'KINSHIP_ZONE_PILOT_CAVEAT',
  'ENHANCEMENT_AVAILABLE',
  'MEANS_TEST_MODEL_OUTDATED',
  'LA_LIVING_COSTS_VARIATION',
  'TAPER_METHOD_ASSUMED',
  'AGE_17_TRANSITION',
  'SCOTLAND_SRA_IS_A_FLOOR',
  'SCOTLAND_FOSTER_KINSHIP_PARITY',
  'SCOTLAND_NO_WORSE_OFF',
  'COUNCIL_POLICY_UNKNOWN',
  'LA_POLICY_UNDER_REVIEW',
  'LOOKED_AFTER_STATUS_UNKNOWN',
  'KINSHIP_ZONE_EXCLUDED_REG6',
  'KINSHIP_ZONE_COMPARISON',
  'CAPITAL_RULE_MAY_APPLY',
  'ANNUAL_REVIEW_DUE',
  'THREE_YEAR_RESPONSIBILITY',
  'BENEFIT_CAP_RISK',
  'TWO_CHILD_LIMIT_ABOLISHED',
  'GUARDIANS_ALLOWANCE_CHECK',
];

const SEVERITY_ORDER: Record<FlagSeverity, number> = { critical: 0, important: 1, info: 2 };

export function makeFlag(code: FlagCode, ctx: FlagContext = {}): Flag {
  const spec = FLAG_CATALOGUE[code];
  const flag: Flag = {
    code,
    severity: spec.severity,
    title: spec.title,
    body: spec.body(ctx),
  };
  if (spec.citationId) flag.citation = cite(spec.citationId);
  if (spec.actionUrl) flag.actionUrl = spec.actionUrl;
  return flag;
}

/** Sort critical, then important, then info, and within each by the order above. */
export function sortFlags(flags: Flag[]): Flag[] {
  return [...flags].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return bySeverity !== 0 ? bySeverity : FLAG_ORDER.indexOf(a.code) - FLAG_ORDER.indexOf(b.code);
  });
}

/**
 * Drop duplicates by code, keeping the first.
 *
 * The first is the one that matters: a warning raised per child carries that
 * child's figures, and the first child's are the ones the ordering was built
 * around.
 */
export function dedupeFlags(flags: Flag[]): Flag[] {
  const seen = new Set<FlagCode>();
  return flags.filter((f) => (seen.has(f.code) ? false : (seen.add(f.code), true)));
}
