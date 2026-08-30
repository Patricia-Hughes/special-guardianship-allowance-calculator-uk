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
      className="avoid-break"
      style={{
        border: '2px solid var(--colour-line)',
        borderRadius: 'var(--radius)',
        padding: '1rem 1.25rem',
        margin: '1.5rem 0',
      }}
    >
      <h2 id="estimate-heading" style={{ marginTop: 0, fontSize: '1.25rem' }}>
        Your estimate after a means test
      </h2>
      <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
        {formatMoney(result.totalWeekly)} a week
      </p>
      <p style={{ color: 'var(--colour-text-muted)', margin: '0 0 0.75rem' }}>
        {formatMoney(weeklyToAnnual(result.totalWeekly))} a year
      </p>
      <p style={{ margin: 0 }}>
        This applies the means-test model most English councils use. It is{' '}
        <strong>not a statutory rule</strong>, and your council may work it out differently. The
        arithmetic is set out in full below so you can check it, or ask your council to.
      </p>
    </section>
  );
}
