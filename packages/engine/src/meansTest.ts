/**
 * Means test module, spec §14.
 *
 * This models the DfE Standardised Means Test Model, which most English
 * councils use. It is NOT statutory and it pre-dates Universal Credit [R6], so
 * every result that uses it carries MEANS_TEST_MODEL_OUTDATED.
 *
 * The order of the steps is the part that gets implemented wrong. The 20%
 * disregard comes off INCOME, before any expenditure. Applying it to what is
 * left after outgoings doubles the answer, and it is the single most common
 * error in this calculation. Test T17 exists only to catch it.
 */

import { DataError } from './errors.js';
import {
  add,
  clampMin0,
  monthlyToWeekly,
  mul,
  pence,
  sub,
  weeklyToMonthly,
  type Pence,
} from './money.js';
import type {
  BenefitTable,
  BreakdownStep,
  CapitalConfig,
  FinancesInput,
  IncomeSupportApplicableAmounts,
  MeansTestBreakdown,
  TaperConfig,
} from './types.js';

// ─── What counts ───────────────────────────────────────────────────────────

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
  'child-benefit-assessed-child', // handled separately, and only on opt-in
  'wtc-childcare-element',
] as const;

export type CountableIncomeKind = (typeof COUNTABLE_INCOME)[number];
export type DisregardedIncomeKind = (typeof DISREGARDED_INCOME)[number];

// ─── The model's own numbers ───────────────────────────────────────────────

export const DISREGARD_RATE = 0.2;

/**
 * The DfE standardised model allows basic living costs at 125% of the Income
 * Support applicable amount. Councils may differ, and at least one does:
 * Devon's published procedures set it at 100%. So this is the default, not the
 * law.
 */
export const CORE_LIVING_COSTS_MULTIPLIER = 1.25;

export const DEFAULT_TAPER: TaperConfig = { method: 'pound-for-pound' };

/** Common pattern (Wolverhampton model). Default OFF, see spec §14.4. */
export const DEFAULT_CAPITAL: CapitalConfig = {
  thresholdPence: pence(600000),
  tariffPerBlockPence: pence(100),
  blockSizePence: pence(25000),
  period: 'weekly',
  enabled: false,
};

// ─── Allowable expenditure ─────────────────────────────────────────────────

/**
 * The Income Support applicable amount for this household, WEEKLY.
 *
 * The unit is in the name because getting it wrong is expensive and silent.
 * DWP publishes these figures weekly, the means test works monthly, and the
 * applicable amount feeds the single largest line of allowable expenditure.
 * Treating a weekly figure as monthly shrinks that line by a factor of 4.33,
 * which inflates disposable income, which inflates the contribution the council
 * expects, which cuts the carer's allowance. runMeansTest converts.
 *
 * [HARD] Throws while the DWP figures are PENDING_SOURCE. Do not estimate: a
 * wrong applicable amount silently shifts every means-tested result.
 */
export function incomeSupportApplicableAmountWeekly(
  f: FinancesInput,
  benefits: BenefitTable,
): Pence {
  const amounts = benefits.incomeSupportApplicableAmounts;
  if (amounts.status === 'PENDING_SOURCE') {
    throw new DataError(
      `Income Support applicable amounts for ${benefits.financialYear} are not yet sourced. ` +
        'The means test cannot run without them and they must not be estimated (spec §8.4, §14.5).',
    );
  }

  const schema = amounts.schema;
  const need = (value: number | null | undefined, name: string): number => {
    if (value === null || value === undefined) {
      throw new DataError(`Income Support applicable amount "${name}" is missing`);
    }
    return value;
  };

  const couple = f.adultsInHousehold >= 2;
  let total = couple
    ? need(schema.couplePence, 'couplePence')
    : f.claimantUnder25 === true
      ? need(schema.singleUnder25Pence, 'singleUnder25Pence')
      : need(schema.single25PlusPence, 'single25PlusPence');

  total += need(schema.dependentChildPence, 'dependentChildPence') * f.dependentChildrenInHousehold;
  if (f.dependentChildrenInHousehold > 0) {
    total += need(schema.familyPremiumPence, 'familyPremiumPence');
  }
  if (f.householdHasDisabilityPremium === true) {
    total += disabilityPremium(schema, couple, need);
  }
  if (f.householdHasCarerPremium === true) {
    total += need(schema.carerPremiumPence, 'carerPremiumPence');
  }
  return pence(total);
}

/**
 * DWP publishes a separate, higher couple rate. Charging a couple the single
 * rate understates the applicable amount, which understates allowable
 * expenditure, which overstates the contribution the council expects: the
 * direction of error that costs the carer money. Falls back to the single rate
 * for a table sourced before the couple rate was.
 */
function disabilityPremium(
  schema: IncomeSupportApplicableAmounts['schema'],
  couple: boolean,
  need: (value: number | null | undefined, name: string) => number,
): number {
  const coupleRate = schema.disabilityPremiumCouplePence;
  if (couple && coupleRate !== null && coupleRate !== undefined) return coupleRate;
  return need(schema.disabilityPremiumPence, 'disabilityPremiumPence');
}

// ─── Capital and taper ─────────────────────────────────────────────────────

/** Tariff income from capital. Only runs where an LA override enables it. */
export function tariffIncome(savings: Pence, capital: CapitalConfig): Pence {
  if (!capital.enabled) return pence(0);
  if (savings <= capital.thresholdPence) return pence(0);

  const above = savings - capital.thresholdPence;
  const blocks = Math.ceil(above / capital.blockSizePence);
  const perPeriod = pence(blocks * capital.tariffPerBlockPence);

  // The config states the tariff weekly or monthly; the means test is monthly.
  return capital.period === 'weekly' ? weeklyToMonthly(perPeriod) : perPeriod;
}

/**
 * The taper, genuinely underdetermined (spec §14.3).
 *
 * There is NO published national taper. Policies vary between pound-for-pound,
 * which is the most common, a percentage of disposable income, and a threshold
 * below which nothing is deducted. Configurable, defaulting to
 * pound-for-pound, and every result that uses it carries TAPER_METHOD_ASSUMED.
 */
export function applyTaper(disposable: Pence, taper: TaperConfig): Pence {
  switch (taper.method) {
    case 'pound-for-pound':
      return disposable;
    case 'percentage':
      // Throws rather than defaulting. `?? 1` meant a percentage taper with no
      // percentage quietly became 100 per cent, which is pound-for-pound: the
      // harshest option there is, produced by a configuration mistake, with
      // nothing on the page to say it had happened.
      if (taper.percentage === undefined) {
        throw new DataError(
          'A percentage taper was configured with no percentage. Set one, or use pound-for-pound.',
        );
      }
      return mul(disposable, taper.percentage);
    case 'threshold':
      if (taper.thresholdMonthly === undefined) {
        throw new DataError(
          'A threshold taper was configured with no threshold. Set one, or use pound-for-pound.',
        );
      }
      return clampMin0(sub(disposable, taper.thresholdMonthly));
  }
}

// ─── The calculation ───────────────────────────────────────────────────────

/**
 * Records each step as it goes, so the result page can show the arithmetic and
 * a carer can check it or hand it to their council.
 */
class Breakdown {
  readonly steps: BreakdownStep[] = [];

  add(
    label: string,
    operation: BreakdownStep['operation'],
    valuePence: Pence,
    runningTotalPence: Pence,
    note?: string,
  ): void {
    const step: BreakdownStep = { label, operation, valuePence, runningTotalPence };
    if (note) step.note = note;
    this.steps.push(step);
  }
}

export function runMeansTest(
  f: FinancesInput,
  benefits: BenefitTable,
  taper: TaperConfig,
  capital: CapitalConfig,
  livingCostsMultiplier: number = CORE_LIVING_COSTS_MULTIPLIER,
): MeansTestBreakdown {
  const breakdown = new Breakdown();

  const income = countableIncome(f, breakdown);
  const afterDisregard = applyDisregard(income, breakdown);
  const coreLiving = coreLivingCosts(f, benefits, livingCostsMultiplier);
  const expenditure = allowableExpenditure(f, coreLiving, livingCostsMultiplier, afterDisregard, breakdown);

  const disposable = clampMin0(sub(afterDisregard, expenditure));
  breakdown.add('Income left over', 'result', disposable, disposable);

  // tariffIncome already returns zero when the rule is off, so the ternary that
  // used to guard this call did nothing.
  const capitalTariff = tariffIncome(f.savingsCapital, capital);
  if (capital.enabled) {
    breakdown.add(
      'Assumed income from savings',
      'add',
      capitalTariff,
      add(disposable, capitalTariff),
    );
  }

  const contributionMonthly = applyTaper(add(disposable, capitalTariff), taper);
  breakdown.add(
    'What the council expects you to put in (monthly)',
    'result',
    contributionMonthly,
    contributionMonthly,
    `Using the "${taper.method}" method. There is no national rule for this step.`,
  );

  const contributionWeekly = monthlyToWeekly(contributionMonthly);
  breakdown.add(
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
    coreLivingCostsMultiplier: livingCostsMultiplier,
    totalExpenditureMonthly: expenditure,
    disposableIncomeMonthly: disposable,
    capitalTariffMonthly: capitalTariff,
    taperMethod: taper.method,
    assessedContributionMonthly: contributionMonthly,
    assessedContributionWeekly: contributionWeekly,
    steps: breakdown.steps,
  };
}

/** Step 1: everything that counts as income, monthly. */
function countableIncome(f: FinancesInput, breakdown: Breakdown): Pence {
  let running = f.netEarnings;
  breakdown.add('Net earnings (monthly)', 'add', f.netEarnings, running);

  running = add(running, f.otherIncome);
  breakdown.add(
    'Other income: pensions, maintenance received, lodgers',
    'add',
    f.otherIncome,
    running,
  );

  running = add(running, f.countableBenefits);
  breakdown.add(
    'Benefits that count',
    'add',
    f.countableBenefits,
    running,
    "Disability benefits for the child, Guardian's Allowance and the allowance itself are all ignored.",
  );

  running = add(running, f.childBenefitOtherChildren);
  breakdown.add(
    'Child Benefit for your other children',
    'add',
    f.childBenefitOtherChildren,
    running,
    'Child Benefit for the child this assessment is about is NOT counted here. It is only ever a separate, opt-in deduction at the end.',
  );

  return running;
}

/**
 * Step 2: the 20% disregard, applied to INCOME, BEFORE expenditure.
 *
 * [HARD] Correct:  (3000 × 0.8) − 2000 = 400
 *        Wrong:    (3000 − 2000) × 0.8 = 800
 */
function applyDisregard(income: Pence, breakdown: Breakdown): Pence {
  const afterDisregard = mul(income, 1 - DISREGARD_RATE);
  breakdown.add(
    '20% of your income is ignored',
    'multiply',
    sub(income, afterDisregard),
    afterDisregard,
    'The disregard comes off your income first, before any of your outgoings are taken into account.',
  );
  return afterDisregard;
}

function coreLivingCosts(
  f: FinancesInput,
  benefits: BenefitTable,
  livingCostsMultiplier: number,
): Pence {
  // DWP publishes the applicable amounts weekly; everything else here is
  // monthly. Convert before applying the uplift.
  return mul(weeklyToMonthly(incomeSupportApplicableAmountWeekly(f, benefits)), livingCostsMultiplier);
}

/** Step 3: allowable expenditure, ending with basic living costs. */
function allowableExpenditure(
  f: FinancesInput,
  coreLiving: Pence,
  livingCostsMultiplier: number,
  afterDisregard: Pence,
  breakdown: Breakdown,
): Pence {
  let total = pence(0);
  const spend = (label: string, amount: Pence, note?: string): void => {
    total = add(total, amount);
    breakdown.add(label, 'subtract', amount, sub(afterDisregard, total), note);
  };

  spend('Rent or mortgage', f.housingCosts);
  spend('Council tax', f.councilTax);
  spend('Essential loan repayments', f.essentialLoanRepayments);
  spend('Maintenance you pay out', f.maintenancePaid);
  spend('Pension contributions', f.pensionContributions);
  spend('Childcare costs', f.childcareCosts);

  // The note states the council's own percentage. Saying "plus 25%" to a Devon
  // carer, whose council allows 100%, would describe a calculation the page is
  // not showing them.
  const upliftPercent = Math.round((livingCostsMultiplier - 1) * 100);
  spend(
    'Basic living costs',
    coreLiving,
    upliftPercent === 0
      ? 'Income Support rates for a household your size.'
      : `Income Support rates for a household your size, plus ${upliftPercent}%.`,
  );

  return total;
}

/** True when the means test can run at all for this benefit table. */
export function meansTestAvailable(benefits: BenefitTable): boolean {
  return benefits.incomeSupportApplicableAmounts.status !== 'PENDING_SOURCE';
}
