/**
 * TEST FIXTURES ONLY. Never shipped, never imported by src/.
 *
 * The shipped data deliberately blocks two paths: the means test (the DWP
 * Income Support applicable amounts are PENDING_SOURCE, spec §8.4) and LA
 * overrides (source URLs not yet re-sourced, spec §42 item 5). The legal test
 * cases in spec §35 must still exercise those paths, and §36 says they are
 * never skippable — so tests inject their own data.
 *
 * These numbers are invented for arithmetic, not sourced. They must never leak
 * into /data.
 */

import type {
  BenefitTable,
  CalculatorInput,
  CarerInput,
  ChildInput,
  EnglandRegion,
  FinancesInput,
  IsoDate,
  LaOverride,
  Nation,
  Pence,
} from '../types.js';
import { pence } from '../money.js';
import { defaultDeps, type EngineDeps } from '../engine.js';

export const p = (n: number): Pence => pence(n);
export const d = (s: string): IsoDate => s as IsoDate;

/** A benefit table whose Income Support amounts are all zero, so that the
 *  core-living-costs step contributes exactly £0 and the arithmetic under test
 *  is isolated. */
export const ZERO_IS_BENEFITS: BenefitTable = {
  financialYear: '2026-27',
  effectiveFrom: d('2026-04-06'),
  dataVersion: 'test-fixture',
  childBenefit: {
    eldestWeeklyPence: 2705,
    additionalChildWeeklyPence: 1790,
    sourceId: 'cb-ga-uprating-order-2026',
  },
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
    },
  },
};

/** Deps with a working means test. */
export function depsWithMeansTest(extra?: Partial<EngineDeps>): Partial<EngineDeps> {
  return { benefitTables: [ZERO_IS_BENEFITS], ...extra };
}

/** A publishable LA override — i.e. one with the sourced URLs R9 demands. */
export function publishableLa(over: Partial<LaOverride> & { slug: string }): LaOverride {
  return {
    name: `${over.slug} Council`,
    nation: 'england',
    region: 'rest-of-england',
    publishable: true,
    corePolicy: 'Test policy',
    policySourceUrl: 'https://example.invalid/policy',
    verifiedOn: '2026-08-29',
    ...over,
  };
}

export function child(over: Partial<ChildInput> = {}): ChildInput {
  return {
    id: over.id ?? 'c1',
    ageYears: 12,
    hasDisabilityOrAdditionalNeeds: false,
    wasLookedAfterImmediatelyBeforeOrder: true,
    isEldestInHousehold: true,
    ...over,
  };
}

export function carer(over: Partial<CarerInput> = {}): CarerInput {
  return {
    nation: 'england' as Nation,
    englandRegion: 'south-east' as EnglandRegion,
    wasFosterCarerForThisChild: false,
    monthsSinceOrderMade: 12,
    onMeansTestedBenefits: false,
    ...over,
  };
}

export function finances(over: Partial<FinancesInput> = {}): FinancesInput {
  return {
    netEarnings: p(0),
    otherIncome: p(0),
    countableBenefits: p(0),
    childBenefitOtherChildren: p(0),
    savingsCapital: p(0),
    housingCosts: p(0),
    councilTax: p(0),
    childcareCosts: p(0),
    essentialLoanRepayments: p(0),
    maintenancePaid: p(0),
    pensionContributions: p(0),
    adultsInHousehold: 1,
    dependentChildrenInHousehold: 1,
    ...over,
  };
}

export function input(over: Partial<CalculatorInput> = {}): CalculatorInput {
  return {
    carer: carer(),
    children: [child()],
    applyChildBenefitDeduction: false,
    // Fixed so tests do not drift when the clock does. Inside FY 2026-27.
    asAtDate: d('2026-09-01'),
    ...over,
  };
}

export { defaultDeps };
