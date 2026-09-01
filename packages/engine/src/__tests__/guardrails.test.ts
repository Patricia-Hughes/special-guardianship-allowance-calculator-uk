/** Guardrails — spec §15. Each rule must fire on a violating result. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { assertGuardrails, GuardrailViolation } from '../guardrails.js';
import { calculate } from '../engine.js';
import { cite } from '../referenceData.js';
import { FLAG_CATALOGUE, makeFlag } from '../flags.js';
import type { FlagCode } from '../types.js';
import { pence } from '../money.js';
import { carer, child, d, depsWithMeansTest, finances, input, p } from './fixtures.js';
import type { CalculatorResult, PerChildResult } from '../types.js';

function result(
  childOver: Partial<PerChildResult> = {},
  over: Partial<CalculatorResult> = {},
): CalculatorResult {
  const c: PerChildResult = {
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
    perChild: [c],
    totalWeekly: c.estimatedAllowanceWeekly,
    totalAnnual: pence(c.estimatedAllowanceWeekly * 52),
    meansTestApplied: false,
    flags: [],
    warnings: [],
    computedAt: '2026-09-01T00:00:00.000Z',
    engineVersion: 'test',
    dataVersion: 'test',
    ...over,
  };
}

describe('guardrails', () => {
  it('passes a well-formed result', () => {
    expect(() => assertGuardrails(input(), result())).not.toThrow();
  });

  it('[R5] rejects Scotland routed through the SGO engine', () => {
    const scottish = input({ carer: carer({ nation: 'scotland', englandRegion: undefined }) });
    expect(() => assertGuardrails(scottish, result())).toThrow(/\[R5\]/);
  });

  it('[R5] rejects a non-Scottish input in the Scottish regime', () => {
    expect(() =>
      assertGuardrails(input(), result({ citations: [cite('sra-2026-27')] }, { regime: 'scotland-kinship' })),
    ).toThrow(/\[R5\]/);
  });

  it('[R5] rejects an English citation on a Scottish result flag', () => {
    const scottish = input({ carer: carer({ nation: 'scotland', englandRegion: undefined }) });
    const r = result(
      { citations: [cite('sra-2026-27')] },
      {
        regime: 'scotland-kinship',
        flags: [
          {
            code: 'ANNUAL_REVIEW_DUE',
            severity: 'info',
            title: 'x',
            body: 'y',
            citation: cite('sg-regs-2005-reg10-11'),
          },
        ],
      },
    );
    expect(() => assertGuardrails(scottish, r)).toThrow(/Scottish result flag/);
  });

  it('[R1] rejects each litigated fixed fraction', () => {
    for (const ratio of [2 / 3, 0.58, 0.75, 0.5]) {
      const r = result({ estimatedAllowanceWeekly: pence(Math.round(25500 * ratio)) });
      expect(() => assertGuardrails(input(), r)).toThrow(GuardrailViolation);
    }
  });

  it('[R1] allows a fixed-looking fraction when a means test actually produced it', () => {
    const r = result(
      { estimatedAllowanceWeekly: pence(Math.round(25500 * 0.75)) },
      { meansTestApplied: true },
    );
    expect(() => assertGuardrails(input(), r)).not.toThrow();
  });

  it('[R3] rejects an uncited figure', () => {
    expect(() => assertGuardrails(input(), result({ citations: [] }))).toThrow(/\[R3\]/);
  });

  it('[R2] rejects a silent Child Benefit deduction', () => {
    const r = result({ childBenefitDeductionWeekly: pence(2705) });
    expect(() => assertGuardrails(input({ applyChildBenefitDeduction: false }), r)).toThrow(/\[R2\]/);
  });

  it('[R2] rejects a CB deduction from a means-tested claimant with no critical flag', () => {
    const inp = input({
      carer: carer({ onMeansTestedBenefits: true }),
      applyChildBenefitDeduction: true,
    });
    const r = result({ childBenefitDeductionWeekly: pence(2705) });
    expect(() => assertGuardrails(inp, r)).toThrow(/without a critical flag/);
  });

  it('rejects a negative allowance', () => {
    // Constructed directly: the engine clamps, so this asserts the backstop.
    const r = result({ estimatedAllowanceWeekly: -1 as never });
    expect(() => assertGuardrails(input(), r)).toThrow(/Negative allowance/);
  });

  it('rejects an estimate above the maximum with no floor', () => {
    const r = result({ estimatedAllowanceWeekly: pence(30000) });
    expect(() => assertGuardrails(input(), r)).toThrow(/exceeds maximum/);
  });

  it('allows an estimate above the maximum when a floor explains it', () => {
    const inp = input({
      carer: carer({
        wasFosterCarerForThisChild: true,
        previousWeeklyFosteringAllowance: p(30000),
        monthsSinceOrderMade: 12,
      }),
    });
    const r = result({
      estimatedAllowanceWeekly: pence(30000),
      floorApplied: 'reg7-former-foster-carer',
    });
    expect(() => assertGuardrails(inp, r)).not.toThrow();
  });

  /**
   * The property test spec §34 asks for: for any valid input,
   * estimatedAllowanceWeekly is always ≥ 0 and always ≤ maximumWeekly unless
   * floorApplied !== null.
   */
  it('property: 0 ≤ estimate ≤ maximum unless a floor applied', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 17 }),
        fc.constantFrom('london', 'south-east', 'rest-of-england'),
        fc.integer({ min: 0, max: 2_000_000 }),
        fc.integer({ min: 0, max: 2_000_000 }),
        fc.boolean(),
        fc.boolean(),
        (age, region, earnings, housing, cbDeduct, meansTested) => {
          const r = calculate(
            input({
              carer: carer({
                englandRegion: region as 'london',
                onMeansTestedBenefits: meansTested,
              }),
              children: [child({ ageYears: age })],
              finances: finances({ netEarnings: p(earnings), housingCosts: p(housing) }),
              applyChildBenefitDeduction: cbDeduct,
            }),
            depsWithMeansTest(),
          );
          for (const c of r.perChild) {
            expect(c.estimatedAllowanceWeekly).toBeGreaterThanOrEqual(0);
            if (c.floorApplied === null) {
              expect(c.estimatedAllowanceWeekly).toBeLessThanOrEqual(c.maximumWeekly);
            }
          }
          return true;
        },
      ),
      { numRuns: 500 },
    );
  });
});

/**
 * Citations we hold for the record are stripped of their `holding` prose in the
 * shipped copy, because it is never rendered for them. That is only safe while
 * every citation something actually points at keeps its holding, since that is
 * the line a carer reads under "Where these figures and rules come from".
 */
describe('the shipped citation copy keeps what is rendered', () => {
  it('every flag citation still has the prose the result page shows', () => {
    for (const [code, spec] of Object.entries(FLAG_CATALOGUE)) {
      if (!spec.citationId) continue;
      const c = cite(spec.citationId);
      expect(c.label, `${code} cites ${spec.citationId}, which has no label`).toBeTruthy();
    }
  });

});

/**
 * The Job A review, on the warnings side. Same reasoning as the letters: none
 * of these would break a build or look wrong on screen, and all of them are one
 * tidy-up away from coming back.
 */
describe('the Job A review findings, pinned', () => {
  const ctx = {
    councilName: 'Anytown Council',
    coreWeekly: pence(12000),
    nationalWeekly: pence(18700),
    ageBand: '5-10',
    previousWeekly: pence(30000),
    monthsSinceOrder: 18,
    savingsCapital: pence(700000),
    taperMethod: 'pound-for-pound',
    livingCostsPercent: 100,
    modelLivingCostsPercent: 125,
    policySummary: 'A summary.',
    decisionDate: '2024-01-25',
    policySourceUrl: 'https://example.invalid/decision',
    policyChangedOn: '1 January 2024',
    supersededSummary: 'A later complaint was not upheld.',
  };

  it('no warning tells a carer regulation 7 protects them', () => {
    for (const code of Object.keys(FLAG_CATALOGUE) as FlagCode[]) {
      const flag = makeFlag(code, ctx);
      expect(`${flag.title} ${flag.body}`, `${code} still says protected`).not.toMatch(
        /\bprotect(s|ed|ion)\b/i,
      );
    }
  });

  it('says the two-year point can end the reward element as well as continue it', () => {
    expect(makeFlag('REG7_EXPIRING', ctx).body).toMatch(/cuts both ways/i);
    expect(makeFlag('REG7_EXPIRING', ctx).body).toMatch(/can lawfully stop/i);
  });

  it('does not tell a carer a fixed percentage has been ruled unlawful', () => {
    const flag = makeFlag('FIXED_PERCENTAGE_POLICY', ctx);
    expect(flag.title).not.toMatch(/unlawful/i);
    // The counterweight the guidance page had and the warning did not.
    expect(flag.body).toMatch(/does not have to pay every special guardian/i);
    expect(flag.body).toMatch(/unjustified departure/);
  });

  it('leads the Child Benefit warning with what the regulations permit', () => {
    const flag = makeFlag('UNLAWFUL_CB_DEDUCTION_RISK', ctx);
    const permitted = flag.body.indexOf('regulations allow a council');
    const finding = flag.body.indexOf('found a council at fault');
    expect(permitted).toBeGreaterThan(-1);
    expect(finding).toBeGreaterThan(permitted);
    expect(flag.body).toMatch(/within 12 months/);
    expect(flag.citation?.id).toBe('sg-regs-2005-reg13');
  });

  it('does not read the national minimum as a floor for the carer', () => {
    const body = makeFlag('BELOW_NMA', ctx).body;
    expect(body).toMatch(/minimum for fostering allowances, not a floor/i);
    expect(body).toMatch(/figure your council starts from, not the amount you end up with/i);
  });

  it('shows the date and link on an Ombudsman finding, and nothing when absent', () => {
    const withBoth = makeFlag('LGSCO_FINDING_FORMER_POLICY', ctx).body;
    expect(withBoth).toMatch(/The decision was made on 2024-01-25/);
    expect(withBoth).toMatch(/https:\/\/example\.invalid\/decision/);
    // Nothing hardcoded: with no council data, no council sentence appears.
    const bare = makeFlag('LGSCO_FINDING_FORMER_POLICY', {}).body;
    expect(bare).not.toMatch(/1 January 2024|The decision was made|changed that policy/);
  });

  it('never claims a council must assess, while the provision is unconfirmed', () => {
    for (const code of ['NOT_LOOKED_AFTER_BEFORE_ORDER', 'LOOKED_AFTER_STATUS_UNKNOWN'] as const) {
      expect(makeFlag(code, ctx).body).not.toMatch(/must\*\* assess|must assess/);
    }
  });

  it('does not assert a published policy duty it cannot cite', () => {
    const flag = makeFlag('COUNCIL_POLICY_UNKNOWN', ctx);
    expect(flag.body).not.toMatch(/Councils must have a published policy/);
    expect(flag.body).toMatch(/kinship local offer/);
    expect(flag.citation?.id).toBe('kinship-care-guidance-2024');
  });

  it('does not contradict itself about when rates change', () => {
    // RATES_STALE said rates change on 1 April full stop; APRIL_RATE_BOUNDARY
    // explains that the government uses a tax year. Both appear on one result.
    expect(makeFlag('RATES_STALE', ctx).body).not.toMatch(/take effect on 1 April each year/);
  });
});
