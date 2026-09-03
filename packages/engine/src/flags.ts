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
export const FLAG_ORDER: FlagCode[] = [
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
  // Both are notes about how a rate table is printed rather than about the
  // carer's own position, so they sit at the quiet end. They were missing from
  // this list entirely, and indexOf returns -1 for a code that is not here,
  // which sorted them AHEAD of everything else in their severity band: a
  // Welsh carer met a remark about band ordering before anything about their
  // rights. checkFlagOrderIsComplete keeps the two lists in step.
  'APRIL_RATE_BOUNDARY',
  'WALES_BAND_ORDER_ANOMALY',
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
  // A code missing from FLAG_ORDER sorts LAST rather than first. indexOf gives
  // -1, which put an unlisted warning at the top of its severity band, and the
  // failure was silent: nothing looked wrong, the ordering was just quietly
  // decided by an oversight. The test keeps the lists in step; this makes the
  // consequence harmless if one ever slips through again.
  const rank = (code: Flag['code']): number => {
    const i = FLAG_ORDER.indexOf(code);
    return i === -1 ? FLAG_ORDER.length : i;
  };
  return [...flags].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return bySeverity !== 0 ? bySeverity : rank(a.code) - rank(b.code);
  });
}

/**
 * Drop duplicates by what the warning SAYS, not just by its code.
 *
 * Keying on the code alone lost information. BELOW_NMA and
 * KINSHIP_ZONE_EXCLUDED_REG6 are raised once per child and carry that child's
 * age band and rates, so a carer with a 3-year-old and a 16-year-old had one of
 * the two messages silently thrown away, and the survivor named an age band
 * without saying which child it belonged to. On a critical warning about being
 * underpaid, that is a shortfall the reader never learns about.
 *
 * Two flags with the same code and the same text are the same message and
 * collapse, which is what handles the warnings raised per child that carry no
 * per-child detail. Two with different text are different messages and both
 * stay. sortFlags is a stable sort and ranks by code, so the survivors of one
 * code stay together, in the order the children were entered.
 */
export function dedupeFlags(flags: Flag[]): Flag[] {
  const seen = new Set<string>();
  return flags.filter((f) => {
    // A NUL separator, because a flag body contains spaces and newlines and
    // must not be able to collide with the code in front of it.
    const key = `${f.code}\u0000${f.body}`;
    return seen.has(key) ? false : (seen.add(key), true);
  });
}
