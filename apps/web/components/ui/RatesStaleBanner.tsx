import { RATE_TABLES, todayUtc } from '@sgo/engine';
import { StaleWatch } from './StaleWatch';

/**
 * [§33] Rates past their effectiveTo get a site-wide critical banner.
 *
 * This is a static export, so a server component sees the date the SITE WAS
 * BUILT, not the date the reader is looking at it. That made the old version of
 * this file inert: it checked `todayUtc()` at build time and froze the answer
 * into the HTML, so the one case it exists for, a deploy left up across an April
 * boundary without a rebuild, was the one case it could never detect. The build
 * is separately gated by scripts/check-staleness.ts, which means the build-time
 * check can only ever fire in a situation the build already refuses.
 *
 * So both halves are needed:
 *
 *   server  the banner is in the HTML when the site is built already stale, so
 *           it works with JavaScript off. That is why this was server-rendered.
 *   client  StaleWatch re-checks the reader's own date against the same
 *           deadline, which is what catches a site nobody has rebuilt.
 */
export function RatesStaleBanner() {
  const newest = RATE_TABLES.filter((t) => t.status !== 'PENDING_SOURCE').sort((a, b) =>
    b.effectiveTo.localeCompare(a.effectiveTo),
  )[0];
  if (!newest) return null;

  const staleAtBuildTime = todayUtc() > newest.effectiveTo;
  return <StaleWatch effectiveTo={newest.effectiveTo} staleAtBuildTime={staleAtBuildTime} />;
}
