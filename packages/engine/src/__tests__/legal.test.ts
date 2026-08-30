/**
 * Legal correctness — spec §35.
 *
 * These are the cases that must never break. The spec is explicit: write these
 * BEFORE the engine — they are the specification, the code is the
 * implementation. Branch protection forbids merging without them, and §36 says
 * they are not skippable, ever, including for a hotfix.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { calculate } from '../engine.js';
import { calculateBackdating } from '../backdating.js';
import { assertGuardrails, GuardrailViolation } from '../guardrails.js';
import { apportion, pence } from '../money.js';
import { selectBenefitTable, selectRateTable } from '../dates.js';
import { BENEFIT_TABLES, RATE_TABLES, cite } from '../referenceData.js';
import { COUNTABLE_INCOME, DISREGARDED_INCOME } from '../meansTest.js';
import { DataError, ValidationError } from '../errors.js';
import type { CalculatorResult, PerChildResult } from '../types.js';

import {
  ZERO_IS_BENEFITS,
  carer,
  child,
  d,
  depsWithMeansTest,
  finances,
  input,
  p,
  publishableLa,
} from './fixtures.js';

describe('SGO engine — legal correctness', () => {
  it('T1  returns the NMA maximum when no finances are given', () => {
    const r = calculate(
      input({ carer: carer({ englandRegion: 'south-east' }), children: [child({ ageYears: 12 })] }),
    );
    expect(r.perChild[0]!.maximumWeekly).toBe(25500);
    expect(r.meansTestApplied).toBe(false);
    expect(r.perChild[0]!.estimatedAllowanceWeekly).toBe(25500);
    expect(r.totalAnnual).toBe(25500 * 52);
  });

  it('T2  London 16yo returns £309/week', () => {
    const r = calculate(
      input({ carer: carer({ englandRegion: 'london' }), children: [child({ ageYears: 16 })] }),
    );
    expect(r.perChild[0]!.maximumWeekly).toBe(30900);
    expect(r.perChild[0]!.ageBand).toBe('16-17');
  });

  it('T3  apportions contribution by maximum, losing no pennies', () => {
    // 4yo (18200p) + 14yo (22700p) rest-of-England, contribution 10000p/wk.
    const shares = apportion(pence(10000), [18200, 22700]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10000);
    expect(shares).toHaveLength(2);
    // And through the engine, on the real maxima.
    const r = calculate(
      input({
        carer: carer({ englandRegion: 'rest-of-england' }),
        children: [
          child({ id: 'a', ageYears: 4, isEldestInHousehold: false }),
          child({ id: 'b', ageYears: 14, isEldestInHousehold: true }),
        ],
        finances: finances({ dependentChildrenInHousehold: 2, netEarnings: p(100000) }),
      }),
      depsWithMeansTest(),
    );
    expect(r.perChild[0]!.maximumWeekly).toBe(18200);
    expect(r.perChild[1]!.maximumWeekly).toBe(22700);
    const contribution = r.meansTestBreakdown!.assessedContributionWeekly;
    const summed = r.perChild.reduce((a, c) => a + c.assessedContributionWeekly, 0);
    expect(summed).toBe(contribution);
  });

  it('T4  [R2] raises a critical flag when CB is deducted from a means-tested claimant', () => {
    const r = calculate(
      input({
        carer: carer({ onMeansTestedBenefits: true }),
        finances: finances({ netEarnings: p(100000) }),
        applyChildBenefitDeduction: true,
      }),
      depsWithMeansTest(),
    );
    const flag = r.flags.find((f) => f.code === 'UNLAWFUL_CB_DEDUCTION_RISK');
    expect(flag).toBeDefined();
    expect(flag!.severity).toBe('critical');
    expect(r.perChild[0]!.childBenefitDeductionWeekly).toBe(2705);
  });

  it('T5  [R2] does NOT deduct Child Benefit by default', () => {
    const r = calculate(
      input({ finances: finances({ netEarnings: p(100000) }) }),
      depsWithMeansTest(),
    );
    expect(r.perChild[0]!.childBenefitDeductionWeekly).toBe(0);
    // …and not on the maximum-only path either.
    const maxOnly = calculate(input());
    expect(maxOnly.perChild[0]!.childBenefitDeductionWeekly).toBe(0);
  });

  it('T6  [R2] throws if CB is deducted without explicit opt-in', () => {
    const inp = input({ applyChildBenefitDeduction: false });
    const result = resultWith({ childBenefitDeductionWeekly: pence(2705), estimatedAllowanceWeekly: pence(22795) });
    expect(() => assertGuardrails(inp, result)).toThrow(GuardrailViolation);
    expect(() => assertGuardrails(inp, result)).toThrow(/\[R2\]/);
  });

  it('T7  [R4] reg 7 floor holds a former foster carer at their previous rate', () => {
    const r = calculate(
      input({
        carer: carer({
          wasFosterCarerForThisChild: true,
          previousWeeklyFosteringAllowance: p(30000),
          monthsSinceOrderMade: 12,
        }),
        // Income large enough that the means test would otherwise strip the award.
        finances: finances({ netEarnings: p(1_000_000) }),
      }),
      depsWithMeansTest(),
    );
    expect(r.perChild[0]!.estimatedAllowanceWeekly).toBe(30000);
    expect(r.perChild[0]!.floorApplied).toBe('reg7-former-foster-carer');
    expect(r.flags.some((f) => f.code === 'REG7_FLOOR_APPLIED')).toBe(true);
  });

  it('T7b [R4] the reg 7 floor also holds on the maximum-only path', () => {
    // Regression: the floor used to live only in the means-test branch, so a
    // former foster carer whose previous allowance exceeded the NMA was shown a
    // figure below it on every Phase 1 (maximum-only) calculation. The R4
    // guardrail caught it.
    const r = calculate(
      input({
        carer: carer({
          wasFosterCarerForThisChild: true,
          previousWeeklyFosteringAllowance: p(30000),
          monthsSinceOrderMade: 12,
        }),
        children: [child({ ageYears: 12 })], // South East maximum is 25500p
      }),
    );
    expect(r.meansTestApplied).toBe(false);
    expect(r.perChild[0]!.maximumWeekly).toBe(25500);
    expect(r.perChild[0]!.estimatedAllowanceWeekly).toBe(30000);
    expect(r.perChild[0]!.floorApplied).toBe('reg7-former-foster-carer');
    expect(r.perChild[0]!.citations.map((c) => c.id)).toContain('sg-regs-2005-reg7');
  });

  it('T8  [R4] the floor does not apply after 24 months', () => {
    const r = calculate(
      input({
        carer: carer({
          wasFosterCarerForThisChild: true,
          previousWeeklyFosteringAllowance: p(30000),
          monthsSinceOrderMade: 25,
        }),
        finances: finances({ netEarnings: p(1_000_000) }),
      }),
      depsWithMeansTest(),
    );
    expect(r.perChild[0]!.floorApplied).toBeNull();
    expect(r.perChild[0]!.estimatedAllowanceWeekly).toBeLessThan(30000);
  });

  it('T9  [R4] throws if a result falls below the reg 7 floor', () => {
    const inp = input({
      carer: carer({
        wasFosterCarerForThisChild: true,
        previousWeeklyFosteringAllowance: p(30000),
        monthsSinceOrderMade: 12,
      }),
    });
    const result = resultWith({ estimatedAllowanceWeekly: pence(15000) });
    expect(() => assertGuardrails(inp, result)).toThrow(/\[R4\]/);
  });

  it('T10 [R5] Scotland routes to the kinship regime', () => {
    const r = calculate(
      input({
        carer: carer({ nation: 'scotland', englandRegion: undefined }),
        children: [child({ ageYears: 8 })],
      }),
    );
    expect(r.regime).toBe('scotland-kinship');
    expect(r.meansTestApplied).toBe(false);
    expect(r.perChild[0]!.estimatedAllowanceWeekly).toBe(20671);
    expect(r.perChild[0]!.floorApplied).toBe('scottish-recommended-allowance');
  });

  it('T11 [R5] throws if an English citation is attached to a Scottish result', () => {
    const inp = input({ carer: carer({ nation: 'scotland', englandRegion: undefined }) });
    const result = resultWith(
      { citations: [cite('sg-regs-2005-reg6')] },
      { regime: 'scotland-kinship' },
    );
    expect(() => assertGuardrails(inp, result)).toThrow(/\[R5\]/);
  });

  it('T12 Kinship Zone gives full NMA with no means test', () => {
    const r = calculate(
      input({
        carer: carer({
          localAuthoritySlug: 'bolton',
          englandRegion: 'rest-of-england',
          childWouldOtherwiseBeInCare: true,
        }),
        children: [child({ ageYears: 8 })],
        finances: finances({ netEarnings: p(2_000_000) }),
      }),
      depsWithMeansTest(),
    );
    expect(r.regime).toBe('kinship-zone');
    expect(r.perChild[0]!.estimatedAllowanceWeekly).toBe(20100);
    expect(r.meansTestApplied).toBe(false);
    expect(r.flags.some((f) => f.code === 'KINSHIP_ZONE_ELIGIBLE')).toBe(true);
    expect(r.flags.some((f) => f.code === 'KINSHIP_ZONE_PILOT_CAVEAT')).toBe(true);
  });

  it('T13 Kinship Zone is excluded when already receiving reg 6 support', () => {
    const r = calculate(
      input({
        carer: carer({
          localAuthoritySlug: 'bolton',
          englandRegion: 'rest-of-england',
          childWouldOtherwiseBeInCare: true,
          alreadyReceivingReg6Support: true,
        }),
        children: [child({ ageYears: 8 })],
      }),
    );
    expect(r.regime).toBe('england-sgo');
    expect(r.flags.some((f) => f.code === 'KINSHIP_ZONE_EXCLUDED_REG6')).toBe(true);
    // The comparison figure is still shown — it is genuinely useful to them.
    expect(r.flags.find((f) => f.code === 'KINSHIP_ZONE_EXCLUDED_REG6')!.body).toContain('£201');
  });

  it('T14 [R1] throws on a fixed-fraction output with no means test', () => {
    for (const ratio of [2 / 3, 0.58, 0.75, 0.5]) {
      const result = resultWith({
        maximumWeekly: pence(30000),
        estimatedAllowanceWeekly: pence(Math.round(30000 * ratio)),
      });
      expect(() => assertGuardrails(input(), result)).toThrow(/\[R1\]/);
    }
  });

  it('T15 [R3] throws on any uncited figure', () => {
    const result = resultWith({ citations: [] });
    expect(() => assertGuardrails(input(), result)).toThrow(/\[R3\]/);
  });

  it('T16 the means test never produces a negative allowance', () => {
    const r = calculate(
      input({ finances: finances({ netEarnings: p(50_000_00) }) }),
      depsWithMeansTest(),
    );
    expect(r.perChild[0]!.estimatedAllowanceWeekly).toBe(0);
    expect(r.totalWeekly).toBe(0);
  });

  it('T17 the 20% disregard is applied to income BEFORE expenditure', () => {
    // income 300000p, expenditure 200000p
    //   correct: 300000 × 0.8 = 240000; 240000 − 200000 = 40000
    //   wrong:   (300000 − 200000) × 0.8 = 80000
    // ← THE most common implementation error.
    const r = calculate(
      input({
        finances: finances({ netEarnings: p(300000), housingCosts: p(200000) }),
      }),
      depsWithMeansTest(),
    );
    const mt = r.meansTestBreakdown!;
    expect(mt.totalCountableIncomeMonthly).toBe(300000);
    expect(mt.incomeAfterDisregardMonthly).toBe(240000);
    expect(mt.totalExpenditureMonthly).toBe(200000);
    expect(mt.disposableIncomeMonthly).toBe(40000);
    expect(mt.disposableIncomeMonthly).not.toBe(80000);
  });

  it('T18 DLA for the child is excluded from countable income', () => {
    expect(DISREGARDED_INCOME).toContain('dla-pip-child');
    expect(COUNTABLE_INCOME).not.toContain('dla-pip-child' as never);
    // There is no input field through which a child's disability benefit could
    // reach the means test — the exclusion is structural, not a subtraction.
    const withDisability = calculate(
      input({
        children: [child({ hasDisabilityOrAdditionalNeeds: true })],
        finances: finances({ netEarnings: p(300000) }),
      }),
      depsWithMeansTest(),
    );
    const without = calculate(
      input({ finances: finances({ netEarnings: p(300000) }) }),
      depsWithMeansTest(),
    );
    expect(withDisability.meansTestBreakdown!.totalCountableIncomeMonthly).toBe(
      without.meansTestBreakdown!.totalCountableIncomeMonthly,
    );
  });

  it('T19 Child Benefit for OTHER children counts; for the assessed child it does not', () => {
    expect(COUNTABLE_INCOME).toContain('child-benefit-other-children');
    expect(DISREGARDED_INCOME).toContain('child-benefit-assessed-child');

    const withOther = calculate(
      input({ finances: finances({ netEarnings: p(300000), childBenefitOtherChildren: p(10000) }) }),
      depsWithMeansTest(),
    );
    const withoutOther = calculate(
      input({ finances: finances({ netEarnings: p(300000) }) }),
      depsWithMeansTest(),
    );
    expect(withOther.meansTestBreakdown!.totalCountableIncomeMonthly).toBe(310000);
    expect(withoutOther.meansTestBreakdown!.totalCountableIncomeMonthly).toBe(300000);

    // The assessed child's own Child Benefit is never income; it is only ever
    // the separate, opt-in deduction at the end.
    expect(withoutOther.perChild[0]!.childBenefitDeductionWeekly).toBe(0);
  });

  it('T20 age 18 input is rejected with a routing message', () => {
    expect(() => calculate(input({ children: [child({ ageYears: 18 })] }))).toThrow(ValidationError);
    try {
      calculate(input({ children: [child({ ageYears: 18 })] }));
    } catch (e) {
      expect((e as ValidationError).message).toMatch(/covers children under 18/);
    }
  });

  it('T21 selects the correct rate table for a backdated asAtDate', () => {
    const r = calculate(
      input({ asAtDate: d('2025-06-01'), children: [child({ ageYears: 12 })] }),
    );
    expect(r.financialYear).toBe('2025-26');
    // South East, 11-15 band, FY 2025-26.
    expect(r.perChild[0]!.maximumWeekly).toBe(24700);
  });

  it('T22 rate and benefit tables are selected independently across 1–6 April', () => {
    const asAt = d('2026-04-03');
    // New allowance rates are already in force on 1 April…
    expect(selectRateTable(RATE_TABLES, asAt).financialYear).toBe('2026-27');
    // …but benefit rates do not change until the first full week of April.
    expect(selectBenefitTable(BENEFIT_TABLES, asAt).financialYear).toBe('2025-26');
    // And on 6 April the benefit table rolls over, while the rates do not move.
    expect(selectBenefitTable(BENEFIT_TABLES, d('2026-04-06')).financialYear).toBe('2026-27');
    expect(selectRateTable(RATE_TABLES, d('2026-04-06')).financialYear).toBe('2026-27');
  });

  it('T23 backdating segments at each 1 April and each age-band birthday', () => {
    const r = calculateBackdating({
      base: input({
        carer: carer({ englandRegion: 'south-east', orderDate: d('2025-05-01') }),
        children: [child({ dateOfBirth: d('2015-06-15'), ageYears: 11 })],
      }),
      fromDate: d('2025-05-01'),
      toDate: d('2026-08-01'),
      actuallyPaidWeekly: p(10000),
    });
    const reasons = r.segments.map((s) => s.reason);
    expect(reasons).toContain('period-start');
    expect(reasons).toContain('financial-year-change');
    // The child turns 11 on 15 June 2026 → moves from the 5-10 band to 11-15.
    expect(reasons).toContain('age-band-change');
    const bands = r.segments.map((s) => s.ageBand);
    expect(bands).toContain('5-10');
    expect(bands).toContain('11-15');
    expect(r.blockedYears).toHaveLength(0);
    expect(r.shortfall).toBeGreaterThan(0);
  });

  it('T24 backdating refuses to estimate across a year it has no verified rates for', () => {
    // The archived GOV.UK table that unblocked 2024/25 says in terms that it
    // applies to England. Wales has no 2024/25 or 2025/26 figures at all, so
    // those years must be left out — never filled in from England's.
    const r = calculateBackdating({
      base: input({
        carer: carer({ nation: 'wales', englandRegion: undefined, orderDate: d('2024-06-01') }),
        children: [child({ dateOfBirth: d('2014-01-10'), ageYears: 12 })],
      }),
      fromDate: d('2024-06-01'),
      toDate: d('2026-08-01'),
      actuallyPaidWeekly: p(10000),
    });
    expect(r.blockedYears).toContain('2024-25');
    expect(r.blockedYears).toContain('2025-26');
    expect(r.yearsCovered).toEqual(['2026-27']);
    // No figure is invented for a blocked year: every segment names a covered one.
    for (const s of r.segments) expect(r.blockedYears).not.toContain(s.financialYear);
    expect(r.caveats[0]).toMatch(/left out 2024-25, 2025-26/);
  });

  it('T24b backdating now covers 2024/25 in England, from the archived table', () => {
    const r = calculateBackdating({
      base: input({
        carer: carer({ englandRegion: 'south-east', orderDate: d('2024-06-01') }),
        children: [child({ dateOfBirth: d('2014-01-10'), ageYears: 12 })],
      }),
      fromDate: d('2024-06-01'),
      toDate: d('2026-08-01'),
      actuallyPaidWeekly: p(10000),
    });
    expect(r.blockedYears).toHaveLength(0);
    expect(r.yearsCovered).toEqual(['2024-25', '2025-26', '2026-27']);
    // A 10-year-old in the South East in June 2024: £208/wk as published, against
    // £100 actually paid. The 2024/25 figure must be the printed one, not one
    // derived by removing an uplift from a later year.
    const first = r.segments[0]!;
    expect(first.financialYear).toBe('2024-25');
    expect(first.maximumWeekly).toBe(20800);
    expect(r.shortfall).toBeGreaterThan(0);
  });

  it('T25 [R10] throws if a rate table is stale for the requested date', () => {
    expect(() => calculate(input({ asAtDate: d('2028-01-01') }))).toThrow(DataError);
    expect(() => selectRateTable(RATE_TABLES, d('2028-01-01'))).toThrow(/No rate table effective/);
    // A PENDING_SOURCE table is still refused rather than used. Every shipped
    // year is now sourced, so this uses a synthetic one — the rule outlives the
    // particular year that happened to be missing when it was written.
    const pendingTable = {
      ...RATE_TABLES[0]!,
      financialYear: '2099-00',
      effectiveFrom: d('2099-04-01'),
      effectiveTo: d('2100-03-31'),
      status: 'PENDING_SOURCE' as const,
    };
    expect(() => selectRateTable([pendingTable], d('2099-06-01'))).toThrow(/not yet sourced/);
  });

  it('T26 a below-NMA LA flat rate raises BELOW_NMA as critical', () => {
    const la = publishableLa({
      slug: 'testshire',
      name: 'Testshire Council',
      region: 'rest-of-england',
      flatCoreRateWeeklyPence: 15000, // below the 20100p rest-of-England 5-10 rate
    });
    const r = calculate(
      input({
        carer: carer({ localAuthoritySlug: 'testshire', englandRegion: 'rest-of-england' }),
        children: [child({ ageYears: 8 })],
      }),
      { laOverrides: { testshire: la } },
    );
    const flag = r.flags.find((f) => f.code === 'BELOW_NMA');
    expect(flag).toBeDefined();
    expect(flag!.severity).toBe('critical');
    expect(r.perChild[0]!.coreAllowanceWeekly).toBe(15000);
  });

  it('T27 apportion never loses or gains a penny (property test, 10k cases)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.array(fc.integer({ min: 0, max: 1_000_000 }), { minLength: 1, maxLength: 10 }),
        (total, weights) => {
          const shares = apportion(pence(total), weights);
          expect(shares).toHaveLength(weights.length);
          expect(shares.reduce((a, b) => a + b, 0)).toBe(total);
          for (const s of shares) expect(Number.isInteger(s)).toBe(true);
        },
      ),
      { numRuns: 10_000 },
    );
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Build a result the guardrails can be pointed at directly. The guardrail tests
 * assert the assertion, not the path that produced it — a guardrail that only
 * fires via the happy path is not a guardrail.
 */
function resultWith(
  childOver: Partial<PerChildResult> = {},
  resultOver: Partial<CalculatorResult> = {},
): CalculatorResult {
  const perChild: PerChildResult = {
    childId: 'c1',
    ageBand: '11-15',
    ageAtCalculation: 12,
    coreAllowanceWeekly: pence(25500),
    enhancementWeekly: pence(0),
    maximumWeekly: pence(25500),
    assessedContributionWeekly: pence(0),
    childBenefitDeductionWeekly: pence(0),
    estimatedAllowanceWeekly: pence(25500),
    floorApplied: null,
    citations: [cite('dfe-guidance-2017-para65')],
    ...childOver,
  };
  return {
    regime: 'england-sgo',
    financialYear: '2026-27',
    ratesEffectiveFrom: d('2026-04-01'),
    perChild: [perChild],
    totalWeekly: perChild.estimatedAllowanceWeekly,
    totalAnnual: pence(perChild.estimatedAllowanceWeekly * 52),
    meansTestApplied: false,
    flags: [],
    warnings: [],
    computedAt: '2026-09-01T00:00:00.000Z',
    engineVersion: 'test',
    dataVersion: 'test',
    ...resultOver,
  };
}

// Keep the fixture import referenced even if a test above is edited away.
export { ZERO_IS_BENEFITS };
