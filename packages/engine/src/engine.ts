/**
 * Calculation engine — spec §13.
 *
 * Pure. No DOM, no network, integer pence throughout. Every path ends in
 * assertGuardrails(), which throws rather than let a legally wrong figure reach
 * a carer.
 *
 * Top-level flow (§13.1):
 *   validate → select rate table → select benefit table (independently, §11)
 *     → Scotland?      → SCOTLAND PATH
 *     → Kinship Zone?  → KINSHIP ZONE PATH
 *     → otherwise        ENGLAND / WALES / NI SGO PATH
 */

import { selectBenefitTable, selectRateTable, todayUtc } from './dates.js';
import { ageOf, monthsSinceOrder, withinReg7Window } from './resolve.js';
import { DataError } from './errors.js';
import { dedupeFlags, makeFlag, sortFlags } from './flags.js';
import { assertGuardrails } from './guardrails.js';
import {
  add,
  apportion,
  clampMin0,
  pence,
  sub,
  weeklyToAnnual,
  type Pence,
} from './money.js';
import {
  DEFAULT_CAPITAL,
  DEFAULT_TAPER,
  meansTestAvailable,
  runMeansTest,
} from './meansTest.js';
import {
  BENEFIT_TABLES,
  ENGINE_VERSION,
  KINSHIP_ZONES,
  LA_NAMES,
  LA_OVERRIDES_ALL,
  RATE_TABLES,
  cite,
  hasUnpublishableLaOverrideIn,
  publishableLaOverrideIn,
} from './referenceData.js';
import { parseCalculatorInput } from './schema.js';
import type {
  AgeBand,
  BenefitTable,
  CalculatorInput,
  CalculatorResult,
  CapitalConfig,
  CarerInput,
  ChildInput,
  Citation,
  EnglandRegion,
  Flag,
  FlatNationRates,
  FloorReason,
  IsoDate,
  KinshipZones,
  LaOverride,
  MeansTestBreakdown,
  Nation,
  PerChildResult,
  RateTable,
  Regime,
  RegionalRates,
  TaperConfig,
} from './types.js';

// ─── Small helpers ─────────────────────────────────────────────────────────

export { ageOf, monthsSinceOrder };

// ─── Injectable reference data ─────────────────────────────────────────────

/**
 * The engine is a pure function of (input, data). Data is injectable so the
 * legal test cases in spec §35 can exercise paths that the SHIPPED data
 * deliberately blocks — the means test (Income Support amounts are
 * PENDING_SOURCE) and LA overrides (source URLs not yet re-sourced) — without
 * ever loosening the shipped defaults or skipping a legal test.
 *
 * Production callers pass nothing and get the versioned files under /data.
 */
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

function resolveDeps(partial?: Partial<EngineDeps>): EngineDeps {
  return { ...defaultDeps(), ...partial };
}


export function regimeFor(nation: Nation): Regime {
  switch (nation) {
    case 'england':
      return 'england-sgo';
    case 'wales':
      return 'wales-sgo';
    case 'northern-ireland':
      return 'ni-sgo';
    case 'scotland':
      return 'scotland-kinship';
  }
}

function nationRates(rates: RateTable, nation: Nation): RegionalRates | FlatNationRates {
  const table = nation === 'england' ? rates.england : rates[nation];
  if (!table) {
    throw new DataError(
      `No ${nation} rates in the ${rates.financialYear} table. They must be sourced, not derived.`,
    );
  }
  return table;
}

export function resolveAgeBand(rates: RateTable, nation: Nation, child: ChildInput, asAt: IsoDate): AgeBand {
  const age = ageOf(child, asAt);
  const table = nationRates(rates, nation);
  const band = table.ageBands.find((b) => age >= b.minAge && age <= b.maxAge);
  if (!band) {
    throw new DataError(`No ${nation} age band covers age ${age} in ${rates.financialYear}`);
  }
  return band;
}

/** The national minimum weekly rate for this carer's area and this age band. */
export function lookupRate(
  rates: RateTable,
  carer: CarerInput,
  band: AgeBand,
  deps: EngineDeps = defaultDeps(),
): Pence {
  const table = nationRates(rates, carer.nation);
  if (carer.nation === 'england') {
    const region = resolveEnglandRegion(carer, deps);
    const regional = (table as RegionalRates).regions[region];
    const value = regional?.[band.id];
    if (value === undefined) {
      throw new DataError(`No England rate for ${region} / ${band.id} in ${rates.financialYear}`);
    }
    return pence(value);
  }
  const value = (table as FlatNationRates).rates[band.id];
  if (value === undefined) {
    throw new DataError(`No ${carer.nation} rate for ${band.id} in ${rates.financialYear}`);
  }
  return pence(value);
}

/** England region, from the explicit choice or from the council the carer picked. */
export function resolveEnglandRegion(
  carer: CarerInput,
  deps: EngineDeps = defaultDeps(),
): EnglandRegion {
  if (carer.englandRegion) return carer.englandRegion;
  const la = publishableLaOverrideIn(deps.laOverrides, carer.localAuthoritySlug);
  if (la) return la.region;
  throw new DataError('An England region is required. Choose a region or a council.');
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

function taperFor(la: LaOverride | undefined, input: CalculatorInput): TaperConfig {
  return input.taperOverride ?? la?.taper ?? DEFAULT_TAPER;
}

function capitalFor(la: LaOverride | undefined): CapitalConfig {
  return la?.capital ?? DEFAULT_CAPITAL;
}

function councilNameFor(slug: string | undefined, deps: EngineDeps): string | undefined {
  if (!slug) return undefined;
  return publishableLaOverrideIn(deps.laOverrides, slug)?.name ?? LA_NAMES[slug];
}

// ─── Universal flags ───────────────────────────────────────────────────────

/** Flags that are true of every SGO result regardless of the numbers. */
function standingFlags(
  input: CalculatorInput,
  asAt: IsoDate,
  rates: RateTable,
  deps: EngineDeps,
): Flag[] {
  const flags: Flag[] = [];

  if (asAt > rates.effectiveTo) {
    flags.push(makeFlag('RATES_STALE', { effectiveTo: rates.effectiveTo }));
  }

  for (const child of input.children) {
    if (child.wasLookedAfterImmediatelyBeforeOrder === false) {
      flags.push(makeFlag('NOT_LOOKED_AFTER_BEFORE_ORDER'));
    }
    if (child.wasLookedAfterImmediatelyBeforeOrder === 'unknown') {
      flags.push(makeFlag('LOOKED_AFTER_STATUS_UNKNOWN'));
    }
    if (ageOf(child, asAt) === 17) {
      flags.push(makeFlag('AGE_17_TRANSITION'));
    }
  }

  const months = monthsSinceOrder(input.carer, asAt);
  if (input.carer.wasFosterCarerForThisChild) {
    flags.push(makeFlag('REG7_EXTENSION_AVAILABLE'));
    flags.push(makeFlag('REG7_MISAPPLICATION_WARNING'));
    if (months >= 18 && months < 24) {
      flags.push(makeFlag('REG7_EXPIRING', { monthsSinceOrder: months }));
    }
  }

  if (months < 36) flags.push(makeFlag('THREE_YEAR_RESPONSIBILITY'));
  flags.push(makeFlag('ANNUAL_REVIEW_DUE'));
  flags.push(makeFlag('GUARDIANS_ALLOWANCE_CHECK'));

  const householdChildren =
    input.finances?.dependentChildrenInHousehold ?? input.children.length;
  if (householdChildren >= 3) flags.push(makeFlag('TWO_CHILD_LIMIT_ABOLISHED'));

  if (hasUnpublishableLaOverrideIn(deps.laOverrides, input.carer.localAuthoritySlug)) {
    flags.push(
      makeFlag('COUNCIL_POLICY_UNKNOWN', {
        councilName: councilNameFor(input.carer.localAuthoritySlug, deps),
      }),
    );
  }

  return flags;
}

// ─── Result assembly ───────────────────────────────────────────────────────

interface FinaliseOpts {
  regime: Regime;
  meansTestApplied: boolean;
  meansTestBreakdown?: MeansTestBreakdown;
  flags: Flag[];
  warnings: string[];
  rates: RateTable;
}

function finalise(
  input: CalculatorInput,
  perChild: PerChildResult[],
  opts: FinaliseOpts,
): CalculatorResult {
  const totalWeekly = add(...perChild.map((c) => c.estimatedAllowanceWeekly));
  const result: CalculatorResult = {
    regime: opts.regime,
    financialYear: opts.rates.financialYear,
    ratesEffectiveFrom: opts.rates.effectiveFrom,
    perChild,
    totalWeekly,
    totalAnnual: weeklyToAnnual(totalWeekly),
    meansTestApplied: opts.meansTestApplied,
    flags: sortFlags(dedupeFlags(opts.flags)),
    warnings: opts.warnings,
    computedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    dataVersion: opts.rates.dataVersion,
  };
  if (opts.meansTestBreakdown) result.meansTestBreakdown = opts.meansTestBreakdown;
  assertGuardrails(input, result);
  return result;
}

// ─── Entry point ───────────────────────────────────────────────────────────

export function calculate(
  rawInput: CalculatorInput,
  depsOverride?: Partial<EngineDeps>,
): CalculatorResult {
  const input = parseCalculatorInput(rawInput);
  const deps = resolveDeps(depsOverride);
  const asAt = input.asAtDate ?? todayUtc();

  const rates = selectRateTable(deps.rateTables, asAt);
  // INDEPENDENT of the rate table — different effective date (§11).
  const benefits = selectBenefitTable(deps.benefitTables, asAt);

  if (input.carer.nation === 'scotland') {
    return scotlandPath(input, rates, asAt, deps);
  }
  if (isKinshipZoneEligible(input, deps)) {
    return kinshipZonePath(input, rates, asAt, deps);
  }
  return sgoPath(input, rates, benefits, asAt, deps);
}

// ─── England / Wales / NI SGO path ─────────────────────────────────────────

const SGO_CITATIONS = (): Citation[] => [
  cite('dfe-guidance-2017-para65'),
  cite('sg-regs-2005-reg6'),
];

function sgoPath(
  input: CalculatorInput,
  rates: RateTable,
  benefits: BenefitTable,
  asAt: IsoDate,
  deps: EngineDeps,
): CalculatorResult {
  const la = publishableLaOverrideIn(deps.laOverrides, input.carer.localAuthoritySlug);

  const flags: Flag[] = standingFlags(input, asAt, rates, deps);
  const warnings: string[] = [];

  if (la?.lawfulnessFlag) {
    flags.push(
      makeFlag('LGSCO_FINDING_AGAINST_LA', {
        councilName: la.name,
        policySummary: la.lawfulnessFlag.summary,
        policySourceUrl: la.lawfulnessFlag.sourceUrl,
      }),
    );
  }
  if (la && /\b(\d{1,3}\s?%|two[- ]thirds|one[- ]third|percentage)\b/i.test(la.corePolicy)) {
    flags.push(makeFlag('FIXED_PERCENTAGE_POLICY', { councilName: la.name }));
  }

  // A carer in a Kinship Zone who is already on reg 6 support runs the normal
  // path, plus a comparison against the pilot rate (§13.5).
  const inZone =
    input.carer.localAuthoritySlug !== undefined &&
    deps.kinshipZones.localAuthorities.includes(input.carer.localAuthoritySlug);

  // ── 1–4: the maximum, per child ─────────────────────────────────────────
  const children = input.children.map((child) => {
    const band = resolveAgeBand(rates, input.carer.nation, child, asAt);
    const national = lookupRate(rates, input.carer, band, deps);

    const core =
      la?.flatCoreRateWeeklyPence !== undefined ? pence(la.flatCoreRateWeeklyPence) : national;

    if (la?.flatCoreRateWeeklyPence !== undefined && core < national) {
      flags.push(
        makeFlag('BELOW_NMA', {
          councilName: la.name,
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
    if (child.hasDisabilityOrAdditionalNeeds) {
      flags.push(makeFlag('ENHANCEMENT_AVAILABLE'));
    }

    if (inZone && input.carer.alreadyReceivingReg6Support === true) {
      flags.push(makeFlag('KINSHIP_ZONE_EXCLUDED_REG6', { kinshipZoneWeekly: national }));
    }

    return { child, band, core, enhancement, maximum: add(core, enhancement) };
  });

  // ── 5: no finances → maximum only ───────────────────────────────────────
  if (!input.finances) {
    const perChild: PerChildResult[] = children.map((c) => {
      // [R4] The reg 7 floor is not a means-test step. A former foster carer
      // inside the two years must never be SHOWN a figure below their previous
      // fostering allowance — including on the maximum-only path, which is the
      // whole of Phase 1.
      const floored = applyReg7Floor(input, c.maximum, asAt, flags);
      return {
        childId: c.child.id,
        ageBand: c.band.id,
        ageAtCalculation: ageOf(c.child, asAt),
        coreAllowanceWeekly: c.core,
        enhancementWeekly: c.enhancement,
        maximumWeekly: c.maximum,
        assessedContributionWeekly: pence(0),
        childBenefitDeductionWeekly: pence(0),
        estimatedAllowanceWeekly: floored.value,
        floorApplied: floored.reason,
        citations: floored.reason
          ? [...SGO_CITATIONS(), cite('sg-regs-2005-reg7'), cite('tower-hamlets-2013')]
          : SGO_CITATIONS(),
      };
    });
    return finalise(input, perChild, {
      regime: regimeFor(input.carer.nation),
      meansTestApplied: false,
      flags,
      warnings,
      rates,
    });
  }

  // ── 6: means test ───────────────────────────────────────────────────────
  if (!meansTestAvailable(benefits)) {
    // Blocked on PENDING_SOURCE data. runMeansTest would throw; surface the
    // DataError rather than silently returning a maximum-only result labelled
    // as means tested.
    throw new DataError(
      `The means test cannot run for ${benefits.financialYear}: the DWP Income Support ` +
        'applicable amounts are not yet sourced (spec §8.4). Maximum-only results are unaffected.',
    );
  }

  const taper = taperFor(la, input);
  const capital = capitalFor(la);
  const mt = runMeansTest(input.finances, benefits, taper, capital);

  flags.push(makeFlag('MEANS_TEST_MODEL_OUTDATED'));
  if (!la?.taper && !input.taperOverride) {
    flags.push(makeFlag('TAPER_METHOD_ASSUMED', { taperMethod: taper.method }));
  }
  if (!capital.enabled && input.finances.savingsCapital > DEFAULT_CAPITAL.thresholdPence) {
    flags.push(makeFlag('CAPITAL_RULE_MAY_APPLY', { savingsCapital: input.finances.savingsCapital }));
  }

  // ── 7: apportion the contribution across children, by maximum ───────────
  const shares = apportion(
    mt.assessedContributionWeekly,
    children.map((c) => c.maximum),
  );

  // ── 8–9: deductions and floors ──────────────────────────────────────────
  const perChild: PerChildResult[] = children.map((c, i) => {
    // [R2] Child Benefit is NEVER deducted by default. Only on an explicit
    // opt-in, and never silently.
    let cb = pence(0);
    if (input.applyChildBenefitDeduction) {
      cb = childBenefitFor(c.child, benefits);
      if (input.carer.onMeansTestedBenefits) {
        flags.push(makeFlag('UNLAWFUL_CB_DEDUCTION_RISK'));
      }
    }

    const share = shares[i] ?? pence(0);
    const netted = clampMin0(sub(sub(c.maximum, share), cb));
    const { value: estimate, reason: floorApplied } = applyReg7Floor(input, netted, asAt, flags);

    return {
      childId: c.child.id,
      ageBand: c.band.id,
      ageAtCalculation: ageOf(c.child, asAt),
      coreAllowanceWeekly: c.core,
      enhancementWeekly: c.enhancement,
      maximumWeekly: c.maximum,
      assessedContributionWeekly: share,
      childBenefitDeductionWeekly: cb,
      estimatedAllowanceWeekly: estimate,
      floorApplied,
      citations: floorApplied
        ? [...SGO_CITATIONS(), cite('sg-regs-2005-reg7'), cite('tower-hamlets-2013')]
        : [...SGO_CITATIONS(), cite('merton-2012')],
    };
  });

  return finalise(input, perChild, {
    regime: regimeFor(input.carer.nation),
    meansTestApplied: true,
    meansTestBreakdown: mt,
    flags,
    warnings,
    rates,
  });
}

/**
 * [R4] reg 7 — a former foster carer must never be shown a figure below their
 * previous fostering allowance within 24 months of the order.
 */
function applyReg7Floor(
  input: CalculatorInput,
  candidate: Pence,
  asAt: IsoDate,
  flags: Flag[],
): { value: Pence; reason: FloorReason | null } {
  const prev = input.carer.previousWeeklyFosteringAllowance;
  if (!withinReg7Window(input.carer, asAt) || prev === undefined || candidate >= prev) {
    return { value: candidate, reason: null };
  }
  flags.push(
    makeFlag('REG7_FLOOR_APPLIED', {
      previousWeekly: prev,
      monthsSinceOrder: monthsSinceOrder(input.carer, asAt),
    }),
  );
  return { value: prev, reason: 'reg7-former-foster-carer' };
}

/** The Child Benefit rate that would apply to this child. Never guessed. */
function childBenefitFor(child: ChildInput, benefits: BenefitTable): Pence {
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

// ─── Scotland path (§13.4) ─────────────────────────────────────────────────

/**
 * [HARD R5] No reg 6, reg 7, para 65 or English case law may be attached to a
 * Scottish result. SGOs do not exist in Scots law.
 */
function scotlandPath(
  input: CalculatorInput,
  rates: RateTable,
  asAt: IsoDate,
  deps: EngineDeps,
): CalculatorResult {
  const flags: Flag[] = [
    makeFlag('SCOTLAND_SRA_IS_A_FLOOR'),
    makeFlag('SCOTLAND_FOSTER_KINSHIP_PARITY'),
    makeFlag('SCOTLAND_NO_WORSE_OFF'),
  ];
  if (asAt > rates.effectiveTo) {
    flags.push(makeFlag('RATES_STALE', { effectiveTo: rates.effectiveTo }));
  }

  const perChild: PerChildResult[] = input.children.map((child) => {
    const band = resolveAgeBand(rates, 'scotland', child, asAt);
    const rate = lookupRate(rates, input.carer, band, deps);
    return {
      childId: child.id,
      ageBand: band.id,
      ageAtCalculation: ageOf(child, asAt),
      coreAllowanceWeekly: rate,
      enhancementWeekly: pence(0),
      maximumWeekly: rate,
      assessedContributionWeekly: pence(0),
      childBenefitDeductionWeekly: pence(0),
      estimatedAllowanceWeekly: rate,
      floorApplied: 'scottish-recommended-allowance' as FloorReason,
      citations: [cite('sra-2026-27')],
    };
  });

  return finalise(input, perChild, {
    regime: 'scotland-kinship',
    meansTestApplied: false,
    flags,
    warnings: [],
    rates,
  });
}

// ─── Kinship Zone path (§13.5) ─────────────────────────────────────────────

function kinshipZonePath(
  input: CalculatorInput,
  rates: RateTable,
  asAt: IsoDate,
  deps: EngineDeps,
): CalculatorResult {
  const flags: Flag[] = [
    makeFlag('KINSHIP_ZONE_ELIGIBLE', {
      councilName: councilNameFor(input.carer.localAuthoritySlug, deps),
    }),
    makeFlag('KINSHIP_ZONE_PILOT_CAVEAT'),
    ...standingFlags(input, asAt, rates, deps),
  ];

  const perChild: PerChildResult[] = input.children.map((child) => {
    const band = resolveAgeBand(rates, input.carer.nation, child, asAt);
    const rate = lookupRate(rates, input.carer, band, deps);
    if (child.hasDisabilityOrAdditionalNeeds) flags.push(makeFlag('ENHANCEMENT_AVAILABLE'));
    return {
      childId: child.id,
      ageBand: band.id,
      ageAtCalculation: ageOf(child, asAt),
      coreAllowanceWeekly: rate,
      enhancementWeekly: pence(0),
      maximumWeekly: rate,
      assessedContributionWeekly: pence(0),
      childBenefitDeductionWeekly: pence(0),
      estimatedAllowanceWeekly: rate,
      floorApplied: 'kinship-zone-nma' as FloorReason,
      citations: [cite('kinship-zones-2026'), cite('dfe-guidance-2017-para65')],
    };
  });

  return finalise(input, perChild, {
    regime: 'kinship-zone',
    meansTestApplied: false,
    flags,
    warnings: [],
    rates,
  });
}
