'use client';

import { formatMoney, weeklyToAnnual, type CalculatorResult, type Pence } from '@sgo/engine';

const REGION_LABEL: Record<string, string> = {
  london: 'London',
  'south-east': 'the South East',
  'rest-of-england': 'the rest of England',
};

/**
 * THE number. Spec §21: lead with the ceiling, not the estimate.
 *
 * "Your council's maximum for a 12-year-old in the South East is £255/week."
 * This is what most users came for, and it is shown before any finances are
 * asked for.
 */
export function MaximumHero({
  result,
  regionLabel,
}: {
  result: CalculatorResult;
  regionLabel?: string;
}) {
  const total = result.perChild.reduce<number>((a, c) => a + c.maximumWeekly, 0) as Pence;
  const single = result.perChild.length === 1 ? result.perChild[0] : undefined;
  const region = regionLabel ? REGION_LABEL[regionLabel] ?? regionLabel : undefined;

  return (
    <section aria-labelledby="maximum-heading" className="avoid-break">
      <h2 id="maximum-heading">
        {result.regime === 'scotland-kinship'
          ? 'The recommended allowance for your area'
          : result.regime === 'kinship-zone'
            ? 'The Kinship Zones pilot rate for your area'
            : "The most your council should be starting from"}
      </h2>
      <p
        style={{
          color: 'var(--colour-money)',
          fontSize: '3rem',
          lineHeight: 1.1,
          fontWeight: 700,
          margin: '0.25rem 0',
        }}
      >
        {formatMoney(total)}
        <span style={{ fontSize: '1.25rem', fontWeight: 600 }}> a week</span>
      </p>
      <p style={{ fontSize: '1.25rem', margin: '0 0 0.75rem', color: 'var(--colour-money)' }}>
        {formatMoney(weeklyToAnnual(total))} a year
      </p>
      <p style={{ color: 'var(--colour-text-muted)' }}>
        {single ? (
          <>
            For a {single.ageAtCalculation}-year-old
            {region ? ` in ${region}` : ''} (age band {single.ageBand}), financial year{' '}
            {result.financialYear.replace('-', '/')}.
          </>
        ) : (
          <>
            For {result.perChild.length} children{region ? ` in ${region}` : ''}, financial year{' '}
            {result.financialYear.replace('-', '/')}.
          </>
        )}
      </p>
      <p>
        <strong>This is an estimate.</strong>{' '}
        {result.regime === 'scotland-kinship'
          ? 'The Scottish Recommended Allowance is a minimum. Your council can pay more.'
          : result.regime === 'kinship-zone'
            ? 'The pilot pays the full fostering National Minimum Allowance with no means test.'
            : 'Your council can lawfully pay less after assessing your circumstances — but this is the figure the guidance says it should start from.'}
      </p>
    </section>
  );
}
