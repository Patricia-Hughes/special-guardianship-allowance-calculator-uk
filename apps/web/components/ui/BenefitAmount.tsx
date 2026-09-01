import { BENEFIT_TABLES, formatMoney, pence } from '@sgo/engine';

/**
 * One benefit figure, rendered from the versioned data.
 *
 * The legal reviewer asked for the Guardian's Allowance amount to appear in
 * prose, because a concrete figure makes people go and check. The house rule
 * says no figures in prose, because they go stale every April and CI rejects
 * them. Both are right, and the way to have both is to render the number
 * instead of typing it: this reads the same table the calculator does, so the
 * page is correct on the day the uprating lands.
 */
const FIELDS = {
  'guardians-allowance': (t: (typeof BENEFIT_TABLES)[number]) =>
    t.guardiansAllowance?.weeklyPerChildPence,
  'child-benefit-eldest': (t: (typeof BENEFIT_TABLES)[number]) =>
    t.childBenefit?.eldestWeeklyPence,
  'child-benefit-additional': (t: (typeof BENEFIT_TABLES)[number]) =>
    t.childBenefit?.additionalChildWeeklyPence,
} as const;

export function BenefitAmount({ name }: { name: keyof typeof FIELDS }) {
  const table = BENEFIT_TABLES.find(
    (t) => t.incomeSupportApplicableAmounts.status !== 'PENDING_SOURCE',
  );
  const value = table ? FIELDS[name](table) : undefined;
  if (value === undefined || value === null) {
    // Never a broken figure and never a blank: say what is missing.
    return <span>an amount we do not currently hold</span>;
  }
  return (
    <span className="tabular">
      {formatMoney(pence(value))} a week{table ? ` (${table.financialYear})` : ''}
    </span>
  );
}
