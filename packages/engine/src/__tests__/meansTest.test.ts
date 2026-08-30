/** Means test module — spec §14. */

import { describe, expect, it } from 'vitest';
import {
  CORE_LIVING_COSTS_MULTIPLIER,
  DEFAULT_CAPITAL,
  DEFAULT_TAPER,
  DISREGARD_RATE,
  applyTaper,
  incomeSupportApplicableAmount,
  meansTestAvailable,
  runMeansTest,
  tariffIncome,
} from '../meansTest.js';
import { DataError } from '../errors.js';
import { BENEFIT_TABLES } from '../referenceData.js';
import { pence } from '../money.js';
import { ZERO_IS_BENEFITS, finances, p } from './fixtures.js';
import type { BenefitTable, CapitalConfig } from '../types.js';

const sourcedBenefits = (over: Partial<Record<string, number>> = {}): BenefitTable => ({
  ...ZERO_IS_BENEFITS,
  incomeSupportApplicableAmounts: {
    status: 'SOURCED',
    schema: {
      singleUnder25Pence: 0,
      single25PlusPence: 0,
      couplePence: 0,
      dependentChildPence: 0,
      familyPremiumPence: 0,
      disabilityPremiumPence: 0,
      carerPremiumPence: 0,
      ...over,
    },
  },
});

describe('means test', () => {
  it('is blocked while the Income Support amounts are PENDING_SOURCE [HARD §14.5]', () => {
    const shipped = BENEFIT_TABLES[0]!;
    expect(meansTestAvailable(shipped)).toBe(false);
    expect(() => incomeSupportApplicableAmount(finances(), shipped)).toThrow(DataError);
    expect(() => incomeSupportApplicableAmount(finances(), shipped)).toThrow(/not yet sourced/);
  });

  it('refuses to run on a partially-sourced table rather than treating a gap as zero', () => {
    const partial: BenefitTable = {
      ...ZERO_IS_BENEFITS,
      incomeSupportApplicableAmounts: {
        status: 'SOURCED',
        schema: {
          singleUnder25Pence: null,
          single25PlusPence: null,
          couplePence: 0,
          dependentChildPence: 0,
          familyPremiumPence: 0,
          disabilityPremiumPence: 0,
          carerPremiumPence: 0,
        },
      },
    };
    expect(() => incomeSupportApplicableAmount(finances(), partial)).toThrow(/single25PlusPence/);
  });

  it('builds the applicable amount from household composition', () => {
    const b = sourcedBenefits({
      single25PlusPence: 10000,
      singleUnder25Pence: 8000,
      couplePence: 16000,
      dependentChildPence: 5000,
      familyPremiumPence: 2000,
      disabilityPremiumPence: 3000,
      carerPremiumPence: 4000,
    });
    // Single, 25+, two dependent children: 10000 + 2×5000 + 2000 family premium.
    expect(
      incomeSupportApplicableAmount(finances({ dependentChildrenInHousehold: 2 }), b),
    ).toBe(22000);
    // Under 25.
    expect(
      incomeSupportApplicableAmount(
        finances({ dependentChildrenInHousehold: 0, claimantUnder25: true }),
        b,
      ),
    ).toBe(8000);
    // Couple with a disability and a carer premium, one child.
    expect(
      incomeSupportApplicableAmount(
        finances({
          adultsInHousehold: 2,
          dependentChildrenInHousehold: 1,
          householdHasDisabilityPremium: true,
          householdHasCarerPremium: true,
        }),
        b,
      ),
    ).toBe(16000 + 5000 + 2000 + 3000 + 4000);
  });

  it('[HARD] applies the 20% disregard to income BEFORE expenditure', () => {
    const mt = runMeansTest(
      finances({ netEarnings: p(300000), housingCosts: p(200000) }),
      sourcedBenefits(),
      DEFAULT_TAPER,
      DEFAULT_CAPITAL,
    );
    expect(DISREGARD_RATE).toBe(0.2);
    expect(mt.incomeAfterDisregardMonthly).toBe(240000);
    expect(mt.disposableIncomeMonthly).toBe(40000);
  });

  it('multiplies the applicable amount by 1.25 for core living costs', () => {
    const mt = runMeansTest(
      finances({ netEarnings: p(500000) }),
      sourcedBenefits({ single25PlusPence: 100000, dependentChildPence: 0, familyPremiumPence: 0 }),
      DEFAULT_TAPER,
      DEFAULT_CAPITAL,
    );
    expect(CORE_LIVING_COSTS_MULTIPLIER).toBe(1.25);
    expect(mt.coreLivingCostsMonthly).toBe(125000);
    expect(mt.totalExpenditureMonthly).toBe(125000);
  });

  it('never returns a negative disposable income', () => {
    const mt = runMeansTest(
      finances({ netEarnings: p(10000), housingCosts: p(500000) }),
      sourcedBenefits(),
      DEFAULT_TAPER,
      DEFAULT_CAPITAL,
    );
    expect(mt.disposableIncomeMonthly).toBe(0);
    expect(mt.assessedContributionMonthly).toBe(0);
  });

  it('records every step for the arithmetic panel', () => {
    const mt = runMeansTest(
      finances({ netEarnings: p(300000), housingCosts: p(100000) }),
      sourcedBenefits(),
      DEFAULT_TAPER,
      DEFAULT_CAPITAL,
    );
    expect(mt.steps.length).toBeGreaterThan(10);
    expect(mt.steps.map((s) => s.label)).toContain('20% of your income is ignored');
    // The Child Benefit note that confuses everyone is surfaced, not implied.
    const cbStep = mt.steps.find((s) => s.label.includes('Child Benefit'));
    expect(cbStep?.note).toMatch(/NOT counted here/);
  });

  describe('taper — genuinely underdetermined (§14.3)', () => {
    it('defaults to pound-for-pound', () => {
      expect(DEFAULT_TAPER.method).toBe('pound-for-pound');
      expect(applyTaper(pence(40000), DEFAULT_TAPER)).toBe(40000);
    });

    it('supports a percentage of disposable income', () => {
      expect(applyTaper(pence(40000), { method: 'percentage', percentage: 0.5 })).toBe(20000);
      expect(applyTaper(pence(40000), { method: 'percentage' })).toBe(40000);
    });

    it('supports a threshold below which nothing is deducted', () => {
      expect(applyTaper(pence(40000), { method: 'threshold', thresholdMonthly: pence(50000) })).toBe(0);
      expect(applyTaper(pence(40000), { method: 'threshold', thresholdMonthly: pence(10000) })).toBe(30000);
      expect(applyTaper(pence(40000), { method: 'threshold' })).toBe(40000);
    });
  });

  describe('capital (§14.4)', () => {
    it('is off by default', () => {
      expect(DEFAULT_CAPITAL.enabled).toBe(false);
      expect(tariffIncome(pence(5_000_000), DEFAULT_CAPITAL)).toBe(0);
    });

    it('applies £1/week per £250 above £6,000 when an LA enables it', () => {
      const enabled: CapitalConfig = { ...DEFAULT_CAPITAL, enabled: true };
      expect(tariffIncome(pence(600000), enabled)).toBe(0);
      // £6,250 → one £250 block → £1/week → ×52/12 monthly.
      expect(tariffIncome(pence(625000), enabled)).toBe(Math.round((100 * 52) / 12));
      // £7,000 → four blocks → £4/week.
      expect(tariffIncome(pence(700000), enabled)).toBe(Math.round((400 * 52) / 12));
    });

    it('handles a monthly-period config without a weekly conversion', () => {
      const monthly: CapitalConfig = { ...DEFAULT_CAPITAL, enabled: true, period: 'monthly' };
      expect(tariffIncome(pence(625000), monthly)).toBe(100);
    });

    it('feeds the tariff into the contribution', () => {
      const mt = runMeansTest(
        finances({ netEarnings: p(300000), savingsCapital: p(700000) }),
        sourcedBenefits(),
        DEFAULT_TAPER,
        { ...DEFAULT_CAPITAL, enabled: true },
      );
      expect(mt.capitalTariffMonthly).toBeGreaterThan(0);
      expect(mt.assessedContributionMonthly).toBe(
        mt.disposableIncomeMonthly + mt.capitalTariffMonthly,
      );
    });
  });
});
