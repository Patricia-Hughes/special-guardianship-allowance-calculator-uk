/**
 * England, Wales and Northern Ireland, spec §13.
 *
 * The shape of the calculation, in the order a carer would follow it:
 *
 *   1. what the council should be starting from, per child
 *   2. stop there if no finances were given, because the ceiling is the answer
 *      most people came for and must never be gated behind a means test
 *   3. otherwise assess a contribution, share it across the children, take any
 *      opted-in Child Benefit deduction, and apply the regulation 7 floor
 */

import { councilPolicyFlags, capitalFor, isInKinshipZone, livingCostsMultiplierFor, taperFor } from '../councilPolicy.js';
import type { EngineDeps } from '../deps.js';
import { DataError } from '../errors.js';
import { makeFlag } from '../flags.js';
import {
  CORE_LIVING_COSTS_MULTIPLIER,
  DEFAULT_CAPITAL,
  meansTestAvailable,
  runMeansTest,
} from '../meansTest.js';
import { add, apportion, clampMin0, pence, sub, type Pence } from '../money.js';
import { lookupRate, regimeFor, resolveAgeBand } from '../rates.js';
import { cite, publishableLaOverrideIn } from '../referenceData.js';
import { ageOf, monthsSinceOrder, withinReg7Window } from '../resolve.js';
import { finalise } from '../result.js';
import { standingFlags } from '../standingFlags.js';
import type {
  AgeBand,
  BenefitTable,
  CalculatorInput,
  CalculatorResult,
  ChildInput,
  Citation,
  Flag,
  FloorReason,
  IsoDate,
  LaOverride,
  PerChildResult,
  RateTable,
} from '../types.js';

/** The two sources behind every SGO figure, fresh each time so nothing shares an array. */
const sgoCitations = (): Citation[] => [cite('dfe-guidance-2017-para65'), cite('sg-regs-2005-reg6')];

/** One child, priced but not yet means tested. */
interface ChildMeasure {
  child: ChildInput;
  band: AgeBand;
  core: Pence;
  enhancement: Pence;
  maximum: Pence;
}

export function sgoPath(
  input: CalculatorInput,
  rates: RateTable,
  benefits: BenefitTable,
  asAt: IsoDate,
  deps: EngineDeps,
): CalculatorResult {
  const la = publishableLaOverrideIn(deps.laOverrides, input.carer.localAuthoritySlug);

  const measured = measureChildren(input, rates, asAt, la, deps);
  const flags: Flag[] = [
    ...standingFlags(input, asAt, rates, deps),
    ...councilPolicyFlags(la),
    ...measured.flags,
  ];

  return input.finances
    ? meansTested(input, measured.children, flags, rates, benefits, asAt, la)
    : maximumOnly(input, measured.children, flags, rates, asAt);
}

// ─── 1: the maximum, per child ─────────────────────────────────────────────

function measureChildren(
  input: CalculatorInput,
  rates: RateTable,
  asAt: IsoDate,
  la: LaOverride | undefined,
  deps: EngineDeps,
): { children: ChildMeasure[]; flags: Flag[] } {
  const flags: Flag[] = [];

  // A carer in a pilot area who is already on regulation 6 support runs the
  // normal path, plus a note comparing it with the pilot rate (§13.5).
  const excludedFromPilot =
    isInKinshipZone(input, deps) && input.carer.alreadyReceivingReg6Support === true;

  const children = input.children.map((child) => {
    const band = resolveAgeBand(rates, input.carer.nation, child, asAt);
    const national = lookupRate(rates, input.carer, band, deps);
    const core =
      la?.flatCoreRateWeeklyPence !== undefined ? pence(la.flatCoreRateWeeklyPence) : national;

    if (core < national) {
      flags.push(
        makeFlag('BELOW_NMA', {
          councilName: la?.name,
          coreWeekly: core,
          nationalWeekly: national,
          ageBand: band.id,
        }),
      );
    }

    // [§13.3] There is NO national figure for a disability enhancement. Do not
    // invent one and do not apply a percentage. Default 0, and tell the carer
    // to ask for it.
    const enhancement =
      la?.enhancementWeeklyPence !== undefined ? pence(la.enhancementWeeklyPence) : pence(0);
    if (child.hasDisabilityOrAdditionalNeeds) flags.push(makeFlag('ENHANCEMENT_AVAILABLE'));

    if (excludedFromPilot) {
      // The band goes in because the pilot rate differs by age, and dedupeFlags
      // now keeps one message per distinct text: without it, two children in
      // different bands would collapse to a single figure naming neither.
      flags.push(
        makeFlag('KINSHIP_ZONE_EXCLUDED_REG6', { kinshipZoneWeekly: national, ageBand: band.id }),
      );
    }

    return { child, band, core, enhancement, maximum: add(core, enhancement) };
  });

  return { children, flags };
}

// ─── 2: no finances given, so the ceiling is the whole answer ──────────────

function maximumOnly(
  input: CalculatorInput,
  children: ChildMeasure[],
  flags: Flag[],
  rates: RateTable,
  asAt: IsoDate,
): CalculatorResult {
  // [R4] The regulation 7 floor is not a means-test step. A former foster carer
  // inside the two years must never be shown a household total below their
  // previous fostering allowance, including on this path, which is the whole of
  // what most people see.
  const maximums = children.map((c) => c.maximum);
  const floor = applyReg7Floor(input, maximums, maximums, asAt);
  flags.push(...floor.flags);

  const perChild = children.map((c, i) => ({
    ...baseResult(c, asAt),
    assessedContributionWeekly: pence(0),
    childBenefitDeductionWeekly: pence(0),
    estimatedAllowanceWeekly: floor.values[i] ?? c.maximum,
    floorApplied: floor.reason,
    citations: floor.reason ? flooredCitations() : sgoCitations(),
  }));

  return finalise(input, perChild, {
    regime: regimeFor(input.carer.nation),
    rates,
    flags,
    meansTestApplied: false,
  });
}

// ─── 3: means tested ───────────────────────────────────────────────────────

function meansTested(
  input: CalculatorInput,
  children: ChildMeasure[],
  flags: Flag[],
  rates: RateTable,
  benefits: BenefitTable,
  asAt: IsoDate,
  la: LaOverride | undefined,
): CalculatorResult {
  const finances = input.finances;
  if (!finances) throw new DataError('meansTested called without finances');

  if (!meansTestAvailable(benefits)) {
    // Blocked on PENDING_SOURCE data. runMeansTest would throw; surface the
    // DataError rather than silently return a maximum-only result labelled as
    // means tested.
    throw new DataError(
      `The means test cannot run for ${benefits.financialYear}: the DWP Income Support ` +
        'applicable amounts are not yet sourced (spec §8.4). Maximum-only results are unaffected.',
    );
  }

  const taper = taperFor(la, input);
  const capital = capitalFor(la);
  const livingCostsMultiplier = livingCostsMultiplierFor(la);
  const assessment = runMeansTest(finances, benefits, taper, capital, livingCostsMultiplier);

  flags.push(makeFlag('MEANS_TEST_MODEL_OUTDATED'));
  if (livingCostsMultiplier !== CORE_LIVING_COSTS_MULTIPLIER) {
    // A council allowing less for living costs assesses a bigger contribution
    // and so pays a smaller allowance. Say where the difference comes from
    // rather than leave the carer to wonder.
    flags.push(
      makeFlag('LA_LIVING_COSTS_VARIATION', {
        ...(la?.name ? { councilName: la.name } : {}),
        livingCostsPercent: Math.round(livingCostsMultiplier * 100),
        modelLivingCostsPercent: Math.round(CORE_LIVING_COSTS_MULTIPLIER * 100),
        ...(la?.policySourceUrl ? { policySourceUrl: la.policySourceUrl } : {}),
      }),
    );
  }
  if (!la?.taper && !input.taperOverride) {
    flags.push(makeFlag('TAPER_METHOD_ASSUMED', { taperMethod: taper.method }));
  }
  // Against the model threshold, not the council's own: where no capital rule is
  // switched on there is no council threshold in play, and this flag only says
  // that a rule might exist, not that one has been applied.
  if (!capital.enabled && finances.savingsCapital > DEFAULT_CAPITAL.thresholdPence) {
    flags.push(makeFlag('CAPITAL_RULE_MAY_APPLY', { savingsCapital: finances.savingsCapital }));
  }

  // The contribution is shared across the children in proportion to what each
  // is worth, so no child absorbs all of it.
  const shares = apportion(
    assessment.assessedContributionWeekly,
    children.map((c) => c.maximum),
  );

  // Priced child by child first, then floored across the household, because the
  // floor is a household figure. See applyReg7Floor.
  const childBenefits = children.map((c) => childBenefitDeduction(input, c.child, benefits, flags));
  const netted = children.map((c, i) =>
    clampMin0(sub(sub(c.maximum, shares[i] ?? pence(0)), childBenefits[i] ?? pence(0))),
  );
  const floor = applyReg7Floor(input, netted, children.map((c) => c.maximum), asAt);
  flags.push(...floor.flags);

  const perChild: PerChildResult[] = children.map((c, i) => ({
    ...baseResult(c, asAt),
    assessedContributionWeekly: shares[i] ?? pence(0),
    childBenefitDeductionWeekly: childBenefits[i] ?? pence(0),
    estimatedAllowanceWeekly: floor.values[i] ?? pence(0),
    floorApplied: floor.reason,
    citations: floor.reason ? flooredCitations() : [...sgoCitations(), cite('merton-2012')],
  }));

  return finalise(input, perChild, {
    regime: regimeFor(input.carer.nation),
    rates,
    flags,
    meansTestApplied: true,
    meansTestBreakdown: assessment,
  });
}

// ─── Shared pieces ─────────────────────────────────────────────────────────

function baseResult(c: ChildMeasure, asAt: IsoDate) {
  return {
    childId: c.child.id,
    ageBand: c.band.id,
    ageAtCalculation: ageOf(c.child, asAt),
    coreAllowanceWeekly: c.core,
    enhancementWeekly: c.enhancement,
    maximumWeekly: c.maximum,
  };
}

const flooredCitations = (): Citation[] => [
  ...sgoCitations(),
  cite('sg-regs-2005-reg7'),
  cite('tower-hamlets-2013'),
];

/**
 * [R4] Regulation 7: a former foster carer must never be shown a HOUSEHOLD
 * TOTAL below their previous fostering allowance within 24 months of the order.
 *
 * The total, not each child. The carer is asked once what they were paid as a
 * foster carer, and the answer is what they actually received, for everyone
 * they were fostering. Flooring each child at that figure paid a carer with two
 * children twice what they used to get, and three children three times it, in
 * the largest text on the page and in the letter they send their council.
 *
 * Where the total falls short, the previous allowance is shared back across the
 * children by what each is worth. That is the same weighting the assessed
 * contribution uses, so the two steps cannot disagree, and apportion guarantees
 * the shares sum to the previous allowance exactly rather than a penny either
 * side of it.
 *
 * A child can come out above its own maximum this way. That is the floor doing
 * its job, and it is why floorApplied is set on every child rather than only on
 * the ones that moved: assertSane allows an estimate above the ceiling only
 * when a floor explains it.
 */
function applyReg7Floor(
  input: CalculatorInput,
  candidates: Pence[],
  weights: Pence[],
  asAt: IsoDate,
): { values: Pence[]; reason: FloorReason | null; flags: Flag[] } {
  const previous = input.carer.previousWeeklyFosteringAllowance;
  const total = add(...candidates);
  if (!withinReg7Window(input.carer, asAt) || previous === undefined || total >= previous) {
    return { values: candidates, reason: null, flags: [] };
  }
  return {
    values: apportion(previous, weights),
    reason: 'reg7-former-foster-carer',
    flags: [
      makeFlag('REG7_FLOOR_APPLIED', {
        previousWeekly: previous,
        monthsSinceOrder: monthsSinceOrder(input.carer, asAt),
      }),
    ],
  };
}

/**
 * [R2] Child Benefit is NEVER deducted by default. Only on an explicit opt-in,
 * and never silently.
 */
function childBenefitDeduction(
  input: CalculatorInput,
  child: ChildInput,
  benefits: BenefitTable,
  flags: Flag[],
): Pence {
  if (!input.applyChildBenefitDeduction) return pence(0);
  if (input.carer.onMeansTestedBenefits) flags.push(makeFlag('UNLAWFUL_CB_DEDUCTION_RISK'));

  const value = child.isEldestInHousehold
    ? benefits.childBenefit.eldestWeeklyPence
    : benefits.childBenefit.additionalChildWeeklyPence;
  if (value === null || value === undefined) {
    throw new DataError(
      `Child Benefit rates for ${benefits.financialYear} are not yet sourced, so they cannot be deducted.`,
    );
  }
  return pence(value);
}
