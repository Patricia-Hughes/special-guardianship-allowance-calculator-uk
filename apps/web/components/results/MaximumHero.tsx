'use client';

import { add, formatMoney, weeklyToAnnual, type CalculatorResult } from '@sgo/engine';

const FLOOR_HEADING: Record<string, string> = {
  // Regulation 7 is a power, not an entitlement: it lets a council keep
  // paying the reward element, and lets it stop. Saying the figure is
  // "protected" told carers they held something they do not.
  'reg7-former-foster-carer': 'We have assumed your old fostering rate continues',
  'kinship-zone-nma': 'The pilot rate applies to you',
  'scottish-recommended-allowance': 'This is the recommended minimum',
};

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
/**
 * Where a floor has raised the figure above the area maximum, reg 7 is the
 * case that matters, the protected amount is the number the carer needs, and
 * it must not be left buried in a flag underneath the area maximum. §21 says
 * lead with the ceiling; for these carers the ceiling is not the whole story.
 */
function FloorNotice({ result }: { result: CalculatorResult }) {
  const floored = result.perChild.filter(
    (c) => c.floorApplied === 'reg7-former-foster-carer' && c.estimatedAllowanceWeekly > c.maximumWeekly,
  );
  if (floored.length === 0) return null;

  const total = result.totalWeekly;
  return (
    <div
      className="avoid-break hero--assumed"
    >
      <h3 className="flush-top">{FLOOR_HEADING['reg7-former-foster-carer']}</h3>
      <p className="hero__figure">
        {formatMoney(total)}
        <span className="hero__unit"> a week</span>
      </p>
      <p className="flush">
        You fostered this child before the order, and it was made less than two years ago. For that
        period your council can carry on paying the reward part of your fostering allowance, and it
        can carry on for longer if it thinks that right. We have assumed it does, which is why this
        figure is higher than the standard rate for your area. That is our assumption, not something
        your council has agreed.
      </p>
    </div>
  );
}

export function MaximumHero({
  result,
  regionLabel,
}: {
  result: CalculatorResult;
  regionLabel?: string;
}) {
  // Through `add`, not a cast: the cast would let a bad value reach the screen.
  const total = add(...result.perChild.map((c) => c.maximumWeekly));
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
        className="hero__figure"
      >
        {formatMoney(total)}
        <span className="hero__unit"> a week</span>
      </p>
      <p className="hero__annual">{formatMoney(weeklyToAnnual(total))} a year</p>
      <p className="muted">
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
      <FloorNotice result={result} />

      <p>
        <strong>This is an estimate.</strong>{' '}
        {result.regime === 'scotland-kinship'
          ? 'The Scottish Recommended Allowance is a minimum. Your council can pay more.'
          : result.regime === 'kinship-zone'
            ? 'The pilot pays the full fostering National Minimum Allowance with no means test.'
            : 'Your council can lawfully pay less after assessing your circumstances. But this is the figure the guidance says it should start from.'}
      </p>
    </section>
  );
}
