/**
 * The shape of the answers, and the pure functions over them.
 *
 * Nothing here touches React or the DOM, so the awkward parts (which child is
 * eldest, what a half-typed number means, how answers become engine input) can
 * be reasoned about and tested on their own.
 */

import type {
  CalculatorInput,
  EnglandRegion,
  FinancesInput,
  MeansTestedBenefit,
  Nation,
  Pence,
} from '@sgo/engine';

// ─── Fields ────────────────────────────────────────────────────────────────

/** A money box: what was typed, and what it parsed to, or null if it did not. */
export interface MoneyValue {
  raw: string;
  pence: number | null;
}

export interface ChildForm {
  /**
   * Identity that survives reordering. Keying the list by array index makes
   * React match the wrong row to the wrong DOM node when a child in the middle
   * is removed, and the symptom is someone's answers appearing to jump between
   * children or vanish. Nothing in the answer decides the key.
   */
  key: string;
  ageYears: string;
  hasDisabilityOrAdditionalNeeds: boolean;
  wasLookedAfterImmediatelyBeforeOrder: 'yes' | 'no' | 'unknown';
}

let childKeySeq = 0;

export function emptyChild(): ChildForm {
  return {
    key: `child-${(childKeySeq += 1)}`,
    ageYears: '',
    hasDisabilityOrAdditionalNeeds: false,
    wasLookedAfterImmediatelyBeforeOrder: 'unknown',
  };
}

/** The schema's own limit. More rows than this cannot be calculated anyway. */
export const MAX_CHILDREN = 10;

export const MEANS_TESTED_BENEFITS: ReadonlyArray<{ id: MeansTestedBenefit; label: string }> = [
  { id: 'universal-credit', label: 'Universal Credit' },
  { id: 'income-support', label: 'Income Support' },
  { id: 'jsa-income-based', label: 'Jobseeker’s Allowance (income-based)' },
  { id: 'esa-income-related', label: 'Employment and Support Allowance (income-related)' },
  { id: 'pension-credit', label: 'Pension Credit' },
  { id: 'housing-benefit', label: 'Housing Benefit' },
  { id: 'council-tax-support', label: 'Council Tax Support' },
];

export const MONEY_FIELDS = [
  ['netEarnings', 'Take-home pay, per month', 'After tax and National Insurance. Include your partner’s.'],
  ['otherIncome', 'Other income, per month', 'Pensions, maintenance you receive, money from a lodger.'],
  ['countableBenefits', 'Benefits that count, per month', 'Do NOT include disability benefits for your child, or Guardian’s Allowance.'],
  ['childBenefitOtherChildren', 'Child Benefit for your OTHER children, per month', 'Not for the child this is about.'],
  ['housingCosts', 'Rent or mortgage, per month', 'After any Housing Benefit.'],
  ['councilTax', 'Council tax, per month', 'After any Council Tax Support.'],
  ['childcareCosts', 'Childcare, per month', ''],
  ['essentialLoanRepayments', 'Essential loan repayments, per month', ''],
  ['maintenancePaid', 'Maintenance you pay out, per month', ''],
  ['pensionContributions', 'Pension contributions, per month', ''],
  ['savingsCapital', 'Savings, in total', 'Not monthly, the total you have.'],
] as const;

export type MoneyFieldName = (typeof MONEY_FIELDS)[number][0];

// ─── The whole form ────────────────────────────────────────────────────────

export interface CalculatorForm {
  nation: Nation | '';
  region: EnglandRegion | '';
  la: string;

  children: ChildForm[];
  eldestIndex: number;
  /** The carer knows their household better than we do, so their choice wins. */
  eldestOverridden: boolean;

  wasFosterCarer: boolean;
  previousAllowance: MoneyValue;
  orderDate: string;
  monthsSinceOrder: string;

  onMeansTestedBenefits: boolean;
  benefitsHeld: MeansTestedBenefit[];

  money: Record<MoneyFieldName, MoneyValue>;
  adults: string;
  householdChildren: string;
  /** Whether the carer has typed in the household-children box themselves. */
  householdChildrenTouched: boolean;

  applyChildBenefitDeduction: boolean;
  childWouldOtherwiseBeInCare: boolean;
  alreadyOnReg6: boolean;
}

export function emptyForm(): CalculatorForm {
  return {
    nation: '',
    region: '',
    la: '',
    children: [emptyChild()],
    eldestIndex: 0,
    eldestOverridden: false,
    wasFosterCarer: false,
    previousAllowance: { raw: '', pence: null },
    orderDate: '',
    monthsSinceOrder: '',
    onMeansTestedBenefits: false,
    benefitsHeld: [],
    money: Object.fromEntries(MONEY_FIELDS.map(([n]) => [n, { raw: '', pence: 0 }])) as Record<
      MoneyFieldName,
      MoneyValue
    >,
    adults: '1',
    householdChildren: '1',
    householdChildrenTouched: false,
    applyChildBenefitDeduction: false,
    childWouldOtherwiseBeInCare: false,
    alreadyOnReg6: false,
  };
}

// ─── Derived answers ───────────────────────────────────────────────────────

/**
 * Index of the oldest child entered, or 0 when no age has been typed yet.
 *
 * Only the eldest attracts the higher rate of Child Benefit, so this decides
 * money. It is derived on demand rather than held in state, because state
 * updated by an effect is not yet correct on the render that a shared link
 * calculates from, and the wrong child would take the higher rate with nothing
 * on screen to say so.
 */
export function indexOfOldest(kids: ReadonlyArray<{ ageYears: string }>): number {
  let best = 0;
  let bestAge = -1;
  kids.forEach((c, i) => {
    const age = Number.parseInt(c.ageYears, 10);
    if (Number.isInteger(age) && age > bestAge) {
      bestAge = age;
      best = i;
    }
  });
  return best;
}

export function eldestIndexOf(form: CalculatorForm): number {
  return form.eldestOverridden ? form.eldestIndex : indexOfOldest(form.children);
}

/**
 * A whole number from a text box, or NaN so the schema can object.
 *
 * `Number.parseInt(raw, 10) || fallback` looks equivalent and is not: 0 is
 * falsy, so someone who deliberately typed 0 had it silently replaced by the
 * fallback and never validated, and the form then accepted an answer they had
 * not given. Refusing is the house rule everywhere else here, so it applies to
 * a zero as much as to a word.
 */
export function wholeNumber(raw: string, blank: number): number {
  if (raw.trim() === '') return blank;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isInteger(n) ? n : Number.NaN;
}

// ─── Form to engine input ──────────────────────────────────────────────────

export function buildInput(form: CalculatorForm, withFinances: boolean): CalculatorInput {
  const eldest = eldestIndexOf(form);
  const money = (name: MoneyFieldName): Pence => (form.money[name].pence ?? 0) as Pence;

  const finances: FinancesInput | undefined = withFinances
    ? ({
        netEarnings: money('netEarnings'),
        otherIncome: money('otherIncome'),
        countableBenefits: money('countableBenefits'),
        childBenefitOtherChildren: money('childBenefitOtherChildren'),
        savingsCapital: money('savingsCapital'),
        housingCosts: money('housingCosts'),
        councilTax: money('councilTax'),
        childcareCosts: money('childcareCosts'),
        essentialLoanRepayments: money('essentialLoanRepayments'),
        maintenancePaid: money('maintenancePaid'),
        pensionContributions: money('pensionContributions'),
        adultsInHousehold: wholeNumber(form.adults, 1),
        // Falls back to the children actually entered, both when the box is
        // blank and when the carer has never touched it. The default used to
        // be a literal 1 that no number of added children ever changed.
        dependentChildrenInHousehold: form.householdChildrenTouched
          ? wholeNumber(form.householdChildren, form.children.length)
          : form.children.length,
      } as FinancesInput)
    : undefined;

  return {
    carer: {
      nation: (form.nation || 'england') as Nation,
      ...(form.region ? { englandRegion: form.region } : {}),
      ...(form.la ? { localAuthoritySlug: form.la } : {}),
      wasFosterCarerForThisChild: form.wasFosterCarer,
      ...(form.orderDate ? { orderDate: form.orderDate as CalculatorInput['asAtDate'] } : {}),
      // Left out entirely when the box is blank. It used to default to 0,
      // which the engine read as "the order was made today".
      ...(form.monthsSinceOrder.trim() === ''
        ? {}
        : { monthsSinceOrderMade: wholeNumber(form.monthsSinceOrder, 0) }),
      ...(form.wasFosterCarer && form.previousAllowance.pence !== null
        ? { previousWeeklyFosteringAllowance: form.previousAllowance.pence as Pence }
        : {}),
      onMeansTestedBenefits: form.onMeansTestedBenefits,
      ...(form.benefitsHeld.length ? { meansTestedBenefitsHeld: form.benefitsHeld } : {}),
      ...(form.childWouldOtherwiseBeInCare ? { childWouldOtherwiseBeInCare: true } : {}),
      ...(form.alreadyOnReg6 ? { alreadyReceivingReg6Support: true } : {}),
    },
    children: form.children.map((c, i) => ({
      id: `child-${i}`,
      ageYears: Number.parseInt(c.ageYears, 10),
      hasDisabilityOrAdditionalNeeds: c.hasDisabilityOrAdditionalNeeds,
      wasLookedAfterImmediatelyBeforeOrder:
        c.wasLookedAfterImmediatelyBeforeOrder === 'unknown'
          ? ('unknown' as const)
          : c.wasLookedAfterImmediatelyBeforeOrder === 'yes',
      isEldestInHousehold: i === eldest,
    })),
    ...(finances ? { finances } : {}),
    applyChildBenefitDeduction: form.applyChildBenefitDeduction,
  };
}

/** The shareable, non-sensitive part of the answers. Never any finances (§22). */
export function shareableState(form: CalculatorForm) {
  // Both lists are built from the SAME filtered set of children, or their
  // indexes drift apart. `ages` drops a child whose age box is blank; if
  // `disability` kept the original positions, a blank first child shifted the
  // flag onto whoever came next, and a shared link arrived with the wrong child
  // marked as disabled. That changes which warnings the reader is shown.
  const entered = form.children.filter((c) => Number.isInteger(Number.parseInt(c.ageYears, 10)));
  const ages = entered.map((c) => Number.parseInt(c.ageYears, 10));
  const disability = entered
    .map((c, i) => (c.hasDisabilityOrAdditionalNeeds ? i : -1))
    .filter((i) => i >= 0);
  return {
    ...(form.nation ? { nation: form.nation } : {}),
    ...(form.region ? { region: form.region } : {}),
    ...(form.la ? { la: form.la } : {}),
    ...(ages.length ? { ages } : {}),
    ...(disability.length ? { disability } : {}),
    ...(form.wasFosterCarer ? { formerFosterCarer: true } : {}),
  };
}
