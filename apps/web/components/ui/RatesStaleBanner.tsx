import { RATE_TABLES, todayUtc } from '@sgo/engine';

/**
 * [§33] Rates past their effectiveTo get a site-wide critical banner.
 *
 * Rendered at build time from the shipped data, no client JS — so it appears
 * even with JavaScript disabled. The build is also gated by
 * scripts/check-staleness.ts, so in practice this fires only if a deploy sits
 * un-rebuilt across an April boundary.
 */
export function RatesStaleBanner() {
  const today = todayUtc();
  const newest = RATE_TABLES.filter((t) => t.status !== 'PENDING_SOURCE').sort((a, b) =>
    b.effectiveTo.localeCompare(a.effectiveTo),
  )[0];
  if (!newest || today <= newest.effectiveTo) return null;

  return (
    <div
      role="alert"
      className="banner-critical"
    >
      <div className="wrap">
        <p>
          <strong>These rates may be out of date.</strong> Our newest figures ran to{' '}
          {newest.effectiveTo}. New rates take effect on 1 April each year. Please check the current
          national minimum allowance before using anything here in a letter.
        </p>
      </div>
    </div>
  );
}
