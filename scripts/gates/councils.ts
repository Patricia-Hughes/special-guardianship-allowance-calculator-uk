/**
 * The gates over what we say about a named council.
 *
 * [R9] Naming a council in public is the most defamation-shaped thing this site
 * does, so every claim about one needs a stored, dated, live source, and every
 * claim must come from a recorded field rather than from reading the prose.
 *
 *   5   a council in la-overrides is in the region map, and they agree
 *   6   the region map covers all 152 authorities, with a name for each
 *   8   a published policy claim carries a source URL
 *   9   a lawfulness finding carries a source URL and a decision date
 *  14   a finding that has become sourced is promoted, not left in the holding pen
 *  15   the fixed-percentage claim is recorded, never inferred from wording
 *  16   a living-costs figure that departs from the model is sourced
 *  17   saying a council was cleared needs the same evidence as saying it was at fault
 */

import type { GateContext, LaEntry } from './context';

/** The number of English children's services authorities (spec §42 item 8). */
const ENGLISH_AUTHORITIES = 152;
/** The DfE model figure. Anything else is a council's own published number. */
const MODEL_LIVING_COSTS_PERCENT = 125;

// ─── 5 and 6: coverage ─────────────────────────────────────────────────────

export function checkRegionCoverage(ctx: GateContext): void {
  const { authorities, regionMap, regionNames, expectedAuthorityCount, report } = ctx;

  for (const la of authorities) {
    if (!(la.slug in regionMap)) {
      report.fail('5 coverage', `la-overrides has "${la.slug}" but la-region-map does not`);
    } else if (la.region && regionMap[la.slug] !== la.region) {
      report.fail(
        '5 coverage',
        `la-overrides says ${la.slug} is in ${la.region}; la-region-map says ${regionMap[la.slug]}`,
      );
    }
  }

  const mapped = Object.keys(regionMap);
  if (mapped.length < ENGLISH_AUTHORITIES) {
    report.fail(
      '6 coverage',
      `la-region-map covers ${mapped.length} authorities, fewer than the ${ENGLISH_AUTHORITIES} English ` +
        "children's services authorities required before launch (spec §42 item 8)",
    );
  }
  if (mapped.length !== expectedAuthorityCount) {
    report.fail(
      '6 coverage',
      `la-region-map has ${mapped.length} entries but declares expectedAuthorityCount ` +
        `${expectedAuthorityCount}. Update the declared count deliberately, so a silent drop is caught.`,
    );
  }
  for (const slug of mapped) {
    if (!regionNames[slug]) report.fail('6 coverage', `la-region-map has no display name for "${slug}"`);
  }

  // Kinship Zone councils must be mapped, or the region lookup fails for them.
  for (const slug of ctx.kinshipZoneSlugs) {
    if (!(slug in regionMap)) {
      report.fail('6 coverage', `Kinship Zone council "${slug}" is not in la-region-map`);
    }
  }
}

// ─── 8, 9 and 10: publishing a council at all ──────────────────────────────

export function checkCouncilSources({ authorities, report }: GateContext): void {
  for (const la of authorities) {
    if (!la.publishable) {
      // The engine is ignoring it. Require the reason to be tracked, so an
      // entry cannot sit unsourced and forgotten.
      if (!la.pendingSourceIssue) {
        report.fail(
          '10 pending',
          `la-overrides "${la.slug}" is publishable: false with no pendingSourceIssue link`,
        );
      }
      report.note(`la-overrides "${la.slug}" is held back from publication pending its source URL`);
      continue;
    }

    const makesAPolicyClaim = Boolean(la.corePolicy) || la.flatCoreRateWeeklyPence !== undefined;
    if (makesAPolicyClaim && !la.policySourceUrl) {
      report.fail(
        '8 R9',
        `la-overrides "${la.slug}" is publishable and makes a policy claim but has no policySourceUrl. ` +
          'Naming a council publicly requires a current citable source.',
      );
    }
    if (la.lawfulnessFlag) {
      if (!la.lawfulnessFlag.sourceUrl) {
        report.fail('9 R9', `la-overrides "${la.slug}" lawfulnessFlag has no sourceUrl`);
      }
      if (!la.lawfulnessFlag.decisionDate) {
        report.fail('9 R9', `la-overrides "${la.slug}" lawfulnessFlag has no decisionDate`);
      }
    }
  }
}

// ─── 14 and 17: findings against a council ─────────────────────────────────

export function checkLawfulnessFindings({ authorities, report }: GateContext): void {
  for (const la of authorities) {
    // pendingLawfulnessFlag exists so an unsourced allegation against a named
    // council cannot be served while the rest of that council's entry
    // publishes. Once someone finds the decision it has to be promoted,
    // otherwise the holding pen quietly becomes where findings go to be
    // forgotten.
    const pending = la.pendingLawfulnessFlag as
      | { sourceUrl?: string; decisionDate?: string }
      | undefined;
    if (pending) {
      if (pending.sourceUrl && pending.decisionDate) {
        report.fail(
          '14 lawfulness',
          `la-overrides "${la.slug}" has a pendingLawfulnessFlag that is now fully sourced. ` +
            'Promote it to lawfulnessFlag so it is actually served, or drop it.',
        );
      } else {
        report.note(
          `la-overrides "${la.slug}" holds an unsourced lawfulness finding back from publication`,
        );
      }
    }

    const finding = la.lawfulnessFlag as
      | { supersededBy?: { sourceUrl?: string; summary?: string } }
      | null
      | undefined;
    if (finding?.supersededBy && (!finding.supersededBy.sourceUrl || !finding.supersededBy.summary)) {
      report.fail(
        '17 lawfulness',
        `la-overrides "${la.slug}" says a finding was superseded but gives no sourceUrl and summary for ` +
          'the later decision. Saying a council has been cleared needs the same evidence as saying it ' +
          'was at fault.',
      );
    }
  }
}

// ─── 15: the fixed-percentage claim ────────────────────────────────────────

/**
 * FIXED_PERCENTAGE_POLICY is a critical flag telling a carer their council may
 * be running a policy the courts struck down. It reads one recorded field and
 * never the prose in corePolicy, which describes what a council does and says
 * nothing reliable about proportions: "Percentage model abolished 2018" and
 * "100% of core fostering allowance" both contain a proportion, and neither
 * describes a council doing this.
 *
 * This gate makes sure the field is answered wherever the prose invites the
 * question. null is a valid answer and means somebody looked.
 */
const PROPORTION_IN_PROSE = /\b(\d{1,3}\s?%|two[- ]thirds|one[- ]third|percentage|proportion)\b/i;

export function checkFixedPercentage({ authorities, report }: GateContext): void {
  for (const la of authorities) {
    const recorded = la.fixedPercentageOfFosteringRate;

    if (PROPORTION_IN_PROSE.test(la.corePolicy ?? '') && recorded === undefined) {
      report.fail(
        '15 fixed-percentage',
        `la-overrides "${la.slug}" describes a proportion in corePolicy but does not record ` +
          'fixedPercentageOfFosteringRate. Set it to the fraction, or to null if the council pays no ' +
          'fixed fraction. It must never be guessed from the wording.',
      );
    }

    if (recorded === undefined || recorded === null) continue;
    if (typeof recorded !== 'number' || !Number.isFinite(recorded) || recorded <= 0) {
      report.fail(
        '15 fixed-percentage',
        `la-overrides "${la.slug}" fixedPercentageOfFosteringRate is ${String(recorded)}, which is not ` +
          'a usable fraction.',
      );
    } else if (recorded < 1 && !la.publishable) {
      report.note(`la-overrides "${la.slug}" records a fixed fraction but is not published`);
    }
  }
}

// ─── 16: living costs ──────────────────────────────────────────────────────

export function checkLivingCosts({ authorities, report }: GateContext): void {
  for (const la of authorities) {
    const pct = la.livingCostsMultiplierPercent;
    if (pct === undefined) continue;
    if (typeof pct !== 'number' || !Number.isFinite(pct) || pct <= 0) {
      report.fail(
        '16 living-costs',
        `la-overrides "${la.slug}" livingCostsMultiplierPercent is not a percentage`,
      );
    } else if (pct !== MODEL_LIVING_COSTS_PERCENT && !la.policySourceUrl) {
      report.fail(
        '16 living-costs',
        `la-overrides "${la.slug}" departs from the model's ${MODEL_LIVING_COSTS_PERCENT}% living-costs ` +
          'figure with no policySourceUrl. This changes every means-tested result for that council.',
      );
    }
  }
}

export const councilGates = [
  checkRegionCoverage,
  checkCouncilSources,
  checkLawfulnessFindings,
  checkFixedPercentage,
  checkLivingCosts,
] satisfies Array<(ctx: GateContext) => void>;

export type { LaEntry };
