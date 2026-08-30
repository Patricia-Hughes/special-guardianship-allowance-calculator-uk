/**
 * Means test module — spec §14.
 *
 * This models the DfE Standardised Means Test Model, which most English
 * councils use. It is NOT statutory and it pre-dates Universal Credit
 * [R6] — every result that uses it carries MEANS_TEST_MODEL_OUTDATED.
 *
 * Blocked at the data layer: the 125% core living-costs step needs the DWP
 * Income Support applicable amounts, which are PENDING_SOURCE (spec §8.4,
 * §14.5). Until they are populated this module throws DataError and the
 * means-test route stays behind FLAGS.MEANS_TEST_ENABLED. We do not estimate
 * the missing figures.
 */

import { DataError } from './errors.js';
import { add, clampMin0, monthlyToWeekly, mul, pence, sub, type Pence } from './money.js';
import type {
  BenefitTable,
  BreakdownStep,
  CapitalConfig,
  FinancesInput,
  MeansTestBreakdown,
  TaperConfig,
} from './types.js';

/**
 * Income that counts. Encoded as data rather than prose because social workers
 * and carers both get this wrong, and the breakdown panel renders it back.
 */
export const COUNTABLE_INCOME = [
  'net-earnings', // both partners
  'self-employed-drawings',
  'employer-sick-pay',
  'esa-incapacity',
  'smp-spp-sap-maternity-allowance',
  'bereavement-benefit',
  'working-tax-credit', // EXCLUDING childcare element
  'pensions', // all
  'income-support',
  'jsa',
  'child-tax-credit',
  'child-benefit-other-children', // NOT the assessed child
  'savings-interest',
  'lodger-income',
  'property-income',
  'maintenance-received',
  'other-adoption-sg-allowances', // for OTHER children
  'assessed-child-legal-entitlement', // trust, legacy
] as const;

export const DISREGARDED_INCOME = [
  'dla-pip-child', // any disability benefit for the child
  'criminal-injuries-compensation',
  'fostering-income-other-children', // where the carer still fosters
  'guardians-allowance',
  'sg-allowance-itself',
  'child-benefit-assessed-child', // handled separately at step 6
  'wtc-childcare-element',
] as const;

export type CountableIncomeKind = (typeof COUNTABLE_INCOME)[number];
export type DisregardedIncomeKind = (typeof DISREGARDED_INCOME)[number];

export const DISREGARD_RATE = 0.2;
export const CORE_LIVING_COSTS_MULTIPLIER = 1.25;

export const DEFAULT_TAPER: TaperConfig = { method: 'pound-for-pound' };

/** Common pattern (Wolverhampton model). Default OFF — see spec §14.4. */
export const DEFAULT_CAPITAL: CapitalConfig = {
  thresholdPence: pence(600000),
  tariffPerBlockPence: pence(100),
  blockSizePence: pence(25000),
  period: 'weekly',
  enabled: false,
};

/**
 * The Income Support applicable amount for this household.
 *
 * [HARD] Throws while the DWP figures are PENDING_SOURCE. Do not estimate:
 * a wrong applicable amount silently shifts every means-tested result.
 */
export function incomeSupportApplicableAmount(f: FinancesInput, benefits: BenefitTable): Pence {
  const isa = benefits.incomeSupportApplicableAmounts;
  if (isa.status === 'PENDING_SOURCE') {
    throw new DataError(
      `Income Support applicable amounts for ${benefits.financialYear} are not yet sourced. ` +
        'The means test cannot run without them and they must not be estimated (spec §8.4, §14.5).',
    );
  }
  const s = isa.schema;
  const need = (v: number | null, name: string): number => {
    if (v === null) {
      throw new DataError(`Income Support applicable amount "${name}" is missing`);
    }
    return v;
  };

  const couple = f.adultsInHousehold >= 2;
  const personal = couple
    ? need(s.couplePence, 'couplePence')
    : f.claimantUnder25 === true
      ? need(s.singleUnder25Pence, 'singleUnder25Pence')
      : need(s.single25PlusPence, 'single25PlusPence');

  let total = personal;
  total += need(s.dependentChildPence, 'dependentChildPence') * f.dependentChildrenInHousehold;
  if (f.dependentChildrenInHousehold > 0) {
    total += need(s.familyPremiumPence, 'familyPremiumPence');
  }
  if (f.householdHasDisabilityPremium === true) {
    total += need(s.disabilityPremiumPence, 'disabilityPremiumPence');
  }
  if (f.householdHasCarerPremium === true) {
    total += need(s.carerPremiumPence, 'carerPremiumPence');
  }
  return pence(total);
}

/** Tariff income from capital. Only runs where an LA override enables it. */
export function tariffIncome(savings: Pence, capital: CapitalConfig): Pence {
  if (!capital.enabled) return pence(0);
  if (savings <= capital.thresholdPence) return pence(0);
  const above = savings - capital.thresholdPence;
  const blocks = Math.ceil(above / capital.blockSizePence);
  const perPeriod = pence(blocks * capital.tariffPerBlockPence);
  // The config expresses the tariff weekly or monthly; the means test is monthly.
  return capital.period === 'weekly' ? pence(Math.round((perPeriod * 52) / 12)) : perPeriod;
}

/**
 * The taper — genuinely underdetermined (spec §14.3).
 *
 * There is NO published national taper. Policies vary between pound-for-pound
 * (most common), a percentage of disposable income, and a threshold below which
 * nothing is deducted. Configurable, defaulting to pound-for-pound, and every
 * result that uses it carries TAPER_METHOD_ASSUMED.
 */
export function applyTaper(disposable: Pence, t: TaperConfig): Pence {
  switch (t.method) {
    case 'pound-for-pound':
      return disposable;
    case 'percentage':
      return mul(disposable, t.percentage ?? 1);
    case 'threshold':
      return clampMin0(sub(disposable, t.thresholdMonthly ?? pence(0)));
  }
}

export function runMeansTest(
  f: FinancesInput,
  benefits: BenefitTable,
  taper: TaperConfig,
  capital: CapitalConfig,
): MeansTestBreakdown {
  const steps: BreakdownStep[] = [];
  const step = (
    label: string,
    operation: BreakdownStep['operation'],
    valuePence: Pence,
    runningTotalPence: Pence,
    note?: string,
  ): void => {
    const s: BreakdownStep = { label, operation, valuePence, runningTotalPence };
    if (note) s.note = note;
    steps.push(s);
  };

  // ── Step 1: countable income (monthly) ──────────────────────────────────
  steps.push({
    label: 'Net earnings (monthly)',
    operation: 'add',
    valuePence: f.netEarnings,
    runningTotalPence: f.netEarnings,
  });
  let running = f.netEarnings;
  running = add(running, f.otherIncome);
  step('Other income — pensions, maintenance received, lodgers', 'add', f.otherIncome, running);
  running = add(running, f.countableBenefits);
  step(
    'Benefits that count',
    'add',
    f.countableBenefits,
    running,
    'Disability benefits for the child, Guardian\'s Allowance and the allowance itself are all ignored.',
  );
  running = add(running, f.childBenefitOtherChildren);
  step(
    'Child Benefit for your other children',
    'add',
    f.childBenefitOtherChildren,
    running,
    'Child Benefit for the child this assessment is about is NOT counted here. It is only ever a separate, opt-in deduction at the end.',
  );

  const income = running;

  // ── Step 2: the 20% disregard, applied to INCOME, BEFORE expenditure ────
  // [HARD] Correct:   (3000 × 0.8) − 2000 = 400
  //        Wrong:     (3000 − 2000) × 0.8 = 800
  // This is the single most common implementation error. Test T17 exists
  // solely to catch it.
  const afterDisregard = mul(income, 1 - DISREGARD_RATE);
  step(
    '20% of your income is ignored',
    'multiply',
    sub(income, afterDisregard),
    afterDisregard,
    'The disregard comes off your income first, before any of your outgoings are taken into account.',
  );

  // ── Step 3: allowable expenditure ───────────────────────────────────────
  const applicableAmount = incomeSupportApplicableAmount(f, benefits);
  const coreLiving = mul(applicableAmount, CORE_LIVING_COSTS_MULTIPLIER);

  let expenditure = pence(0);
  const spend = (label: string, v: Pence, note?: string): void => {
    expenditure = add(expenditure, v);
    step(label, 'subtract', v, sub(afterDisregard, expenditure), note);
  };
  spend('Rent or mortgage', f.housingCosts);
  spend('Council tax', f.councilTax);
  spend('Essential loan repayments', f.essentialLoanRepayments);
  spend('Maintenance you pay out', f.maintenancePaid);
  spend('Pension contributions', f.pensionContributions);
  spend('Childcare costs', f.childcareCosts);
  spend(
    'Basic living costs',
    coreLiving,
    'Income Support rates for a household your size, plus 25%.',
  );

  // ── Step 4: disposable income ───────────────────────────────────────────
  const disposable = clampMin0(sub(afterDisregard, expenditure));
  step('Income left over', 'result', disposable, disposable);

  // ── Step 5: capital tariff ──────────────────────────────────────────────
  const capitalTariff = capital.enabled ? tariffIncome(f.savingsCapital, capital) : pence(0);
  if (capital.enabled) {
    step('Assumed income from savings', 'add', capitalTariff, add(disposable, capitalTariff));
  }

  // ── Step 6: taper ───────────────────────────────────────────────────────
  const contributionMonthly = applyTaper(add(disposable, capitalTariff), taper);
  step(
    'What the council expects you to put in (monthly)',
    'result',
    contributionMonthly,
    contributionMonthly,
    `Using the "${taper.method}" method. There is no national rule for this step.`,
  );

  const contributionWeekly = monthlyToWeekly(contributionMonthly);
  step(
    'What the council expects you to put in (weekly)',
    'result',
    contributionWeekly,
    contributionWeekly,
    'Monthly × 12 ÷ 52.',
  );

  return {
    totalCountableIncomeMonthly: income,
    disregardRate: DISREGARD_RATE,
    incomeAfterDisregardMonthly: afterDisregard,
    coreLivingCostsMonthly: coreLiving,
    coreLivingCostsMultiplier: CORE_LIVING_COSTS_MULTIPLIER,
    totalExpenditureMonthly: expenditure,
    disposableIncomeMonthly: disposable,
    capitalTariffMonthly: capitalTariff,
    taperMethod: taper.method,
    assessedContributionMonthly: contributionMonthly,
    assessedContributionWeekly: contributionWeekly,
    steps,
  };
}

/** True when the means test can run at all for this benefit table. */
export function meansTestAvailable(benefits: BenefitTable): boolean {
  return benefits.incomeSupportApplicableAmounts.status !== 'PENDING_SOURCE';
}
