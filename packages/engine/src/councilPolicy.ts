/**
 * What we hold about an individual council, and what it is safe to say.
 *
 * Two rules run through this file.
 *
 * A council is only ever described from a recorded field, never from the
 * wording of a policy summary. A council paying the full rate, or one that
 * abolished a percentage model years ago, must not be accused of running one.
 *
 * A claim about a council is dated wherever we can date it, so it reads as an
 * observation of a policy at a moment rather than a standing accusation.
 */

import { defaultDeps, type EngineDeps } from './deps.js';
import { DataError } from './errors.js';
import { makeFlag } from './flags.js';
import { CORE_LIVING_COSTS_MULTIPLIER, DEFAULT_CAPITAL, DEFAULT_TAPER } from './meansTest.js';
import { LA_NAMES, publishableLaOverrideIn } from './referenceData.js';
import type { CalculatorInput, CapitalConfig, Flag, LaOverride, TaperConfig } from './types.js';

export function taperFor(la: LaOverride | undefined, input: CalculatorInput): TaperConfig {
  return input.taperOverride ?? la?.taper ?? DEFAULT_TAPER;
}

export function capitalFor(la: LaOverride | undefined): CapitalConfig {
  return la?.capital ?? DEFAULT_CAPITAL;
}

/**
 * Basic living costs as a multiple of the Income Support applicable amount.
 *
 * The DfE model says 125%. A council may publish something else, and Devon
 * does, so this reads the council's own figure where we hold one. An absent
 * percentage means the council follows the model; it never means we failed to
 * look, because an entry only reaches the engine when publishable.
 */
export function livingCostsMultiplierFor(la: LaOverride | undefined): number {
  const pct = la?.livingCostsMultiplierPercent;
  if (pct === undefined) return CORE_LIVING_COSTS_MULTIPLIER;
  if (!Number.isFinite(pct) || pct <= 0) {
    throw new DataError(
      `la-overrides "${la?.slug}" has livingCostsMultiplierPercent ${String(pct)}, which is not a ` +
        'usable percentage. A wrong figure here silently changes every means-tested result.',
    );
  }
  return pct / 100;
}

export function councilNameFor(slug: string | undefined, deps: EngineDeps): string | undefined {
  if (!slug) return undefined;
  return publishableLaOverrideIn(deps.laOverrides, slug)?.name ?? LA_NAMES[slug];
}

export function isKinshipZoneEligible(
  input: CalculatorInput,
  deps: EngineDeps = defaultDeps(),
): boolean {
  const slug = input.carer.localAuthoritySlug;
  if (!slug || !deps.kinshipZones.localAuthorities.includes(slug)) return false;
  if (input.carer.childWouldOtherwiseBeInCare !== true) return false;
  if (input.carer.alreadyReceivingReg6Support === true) return false;
  return true;
}

/** True when the carer's council runs the Kinship Zones pilot, whatever their own eligibility. */
export function isInKinshipZone(input: CalculatorInput, deps: EngineDeps): boolean {
  const slug = input.carer.localAuthoritySlug;
  return slug !== undefined && deps.kinshipZones.localAuthorities.includes(slug);
}

/** Everything we can say about the carer's own council, from what we have recorded. */
export function councilPolicyFlags(la: LaOverride | undefined): Flag[] {
  if (!la) return [];
  const flags: Flag[] = [];

  // Only an upheld finding is served. A complaint that was not upheld, or one
  // whose outcome we have not recorded, is not something to put in front of a
  // carer as a finding against their council.
  const finding = la.lawfulnessFlag;
  if (finding?.code === 'LGSCO_UPHELD') {
    flags.push(
      makeFlag(finding.concernsFormerPolicy ? 'LGSCO_FINDING_FORMER_POLICY' : 'LGSCO_FINDING_AGAINST_LA', {
        councilName: la.name,
        policySummary: finding.summary,
        policySourceUrl: finding.sourceUrl,
        // Where the criticised policy has been changed, or a later complaint
        // about the current practice was not upheld, the flag says so with the
        // finding rather than after it.
        ...(finding.decisionDate ? { decisionDate: finding.decisionDate } : {}),
        ...(finding.policyChangedOn ? { policyChangedOn: finding.policyChangedOn } : {}),
        ...(finding.supersededBy ? { supersededSummary: finding.supersededBy.summary } : {}),
      }),
    );
  }

  if (la.policyUnderReview) {
    flags.push(
      makeFlag('LA_POLICY_UNDER_REVIEW', {
        councilName: la.name,
        ...(la.policyUnderReviewNote ? { policyUnderReviewNote: la.policyUnderReviewNote } : {}),
      }),
    );
  }

  const fraction = la.fixedPercentageOfFosteringRate;
  if (typeof fraction === 'number' && fraction < 1) {
    flags.push(
      makeFlag('FIXED_PERCENTAGE_POLICY', {
        councilName: la.name,
        ...(la.policySourceDate ? { policyCheckedOn: la.policySourceDate } : {}),
      }),
    );
  }

  return flags;
}
