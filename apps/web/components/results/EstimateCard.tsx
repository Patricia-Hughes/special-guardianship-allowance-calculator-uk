import { add, formatMoney, sub, weeklyToAnnual, type CalculatorResult } from '@sgo/engine';

/**
 * Shown only where finances were given. Visually smaller than the maximum, and
 * always labelled "estimate" (spec §21).
 *
 * Never shows a confidence percentage, a progress bar implying precision, or a
 * comparison to a "typical" award. There is no typical award and implying one
 * is misleading.
 *
 * The card used to print the figure and nothing about how it got there, which
 * made the two flat ends of the model look like the site ignoring what was
 * typed. Below roughly £1,300 a month nothing is deducted at all, and above
 * roughly £2,500 the deduction already exceeds the maximum, so in both bands a
 * carer can change the numbers and watch the answer sit still. It was reported
 * as a bug, and as a piece of writing it was one: the arithmetic was right and
 * the page never said what it had done.
 */
export function EstimateCard({ result }: { result: CalculatorResult }) {
  if (!result.meansTestApplied) return null;

  // Household totals, because the model assesses one contribution and shares it
  // across the children rather than testing each child separately.
  const maximum = add(...result.perChild.map((c) => c.maximumWeekly));
  const contribution = add(...result.perChild.map((c) => c.assessedContributionWeekly));
  const deducted = sub(maximum, result.totalWeekly);

  return (
    <section aria-labelledby="estimate-heading" className="avoid-break panel">
      <h2 id="estimate-heading" className="flush-top big">
        Your estimate after a means test
      </h2>
      <p className="estimate__figure">{formatMoney(result.totalWeekly)} a week</p>
      <p className="estimate__note">{formatMoney(weeklyToAnnual(result.totalWeekly))} a year</p>

      {contribution === 0 ? (
        <p>
          <strong>Nothing has been taken off.</strong> On the figures you gave, the model works out
          that you are not expected to contribute anything, so the estimate is the same as the
          maximum above. That is the model doing its job, not your answers being ignored.
        </p>
      ) : result.totalWeekly === 0 ? (
        <p>
          <strong>
            The model reduces the allowance to nothing on the figures you gave.
          </strong>{' '}
          It expects a contribution of {formatMoney(contribution)} a week, which is more than the{' '}
          {formatMoney(maximum)} maximum, so nothing is left. Above roughly this level of income the
          figure stays at zero however much you change the other boxes, because the contribution has
          already passed the maximum.
        </p>
      ) : (
        <p>
          <strong>{formatMoney(deducted)} a week has been taken off</strong> the{' '}
          {formatMoney(maximum)} maximum above, on the figures you gave.
        </p>
      )}

      {result.totalWeekly === 0 && (
        <p>
          A zero here does not mean your council must pay you nothing. It means this one common
          model, applied to these figures, produces nothing. Your council has to look at your actual
          circumstances, and it can pay more than the model suggests.
        </p>
      )}

      <p className="flush">
        This applies the means-test model most English councils use. It is{' '}
        <strong>not a statutory rule</strong>, and your council may work it out differently. The
        arithmetic is set out in full below so you can check it, or ask your council to.
      </p>
    </section>
  );
}
