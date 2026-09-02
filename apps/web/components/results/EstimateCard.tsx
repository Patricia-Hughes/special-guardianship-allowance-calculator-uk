import { formatMoney, weeklyToAnnual, type CalculatorResult } from '@sgo/engine';

/**
 * Shown only where finances were given. Visually smaller than the maximum, and
 * always labelled "estimate" (spec §21).
 *
 * Never shows a confidence percentage, a progress bar implying precision, or a
 * comparison to a "typical" award. There is no typical award and implying one
 * is misleading.
 */
export function EstimateCard({ result }: { result: CalculatorResult }) {
  if (!result.meansTestApplied) return null;
  return (
    <section
      aria-labelledby="estimate-heading"
      className="avoid-break panel"
    >
      <h2 id="estimate-heading" className="flush-top big">
        Your estimate after a means test
      </h2>
      <p className="estimate__figure">
        {formatMoney(result.totalWeekly)} a week
      </p>
      <p className="estimate__note">
        {formatMoney(weeklyToAnnual(result.totalWeekly))} a year
      </p>
      <p className="flush">
        This applies the means-test model most English councils use. It is{' '}
        <strong>not a statutory rule</strong>, and your council may work it out differently. The
        arithmetic is set out in full below so you can check it, or ask your council to.
      </p>
    </section>
  );
}
