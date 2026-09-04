'use client';

import { useEffect, useState } from 'react';

/**
 * The stale-rates banner, checked against the READER's date.
 *
 * The deadline is baked in at build time; the comparison is not. A static site
 * that nobody rebuilds keeps serving the same HTML for years, so the only clock
 * that can tell a carer their figures have expired is the one in their own
 * browser.
 *
 * Rendered on the server too when the build itself was already stale, so the
 * warning survives with JavaScript off. In every other case the server renders
 * nothing and this fills it in after hydration, which is why the two branches
 * cannot be collapsed into one.
 */
export function StaleWatch({
  effectiveTo,
  staleAtBuildTime,
}: {
  effectiveTo: string;
  staleAtBuildTime: boolean;
}) {
  const [staleNow, setStaleNow] = useState(staleAtBuildTime);

  useEffect(() => {
    // Compared as ISO strings in UTC, the same way the engine does it, so a
    // reader in BST at half past midnight on 1 April cannot see a different
    // answer from the one the calculation uses.
    const check = (): void => setStaleNow(new Date().toISOString().slice(0, 10) > effectiveTo);
    check();
    // A tab left open across the boundary is a real case for this audience:
    // people leave the page up and come back to it.
    const daily = setInterval(check, 60 * 60 * 1000);
    return () => clearInterval(daily);
  }, [effectiveTo]);

  if (!staleNow) return null;

  return (
    <div role="alert" className="banner-critical">
      <div className="wrap">
        <p>
          <strong>These rates may be out of date.</strong> My newest figures ran to {effectiveTo}.
          New rates take effect on 1 April each year. Please check the current national minimum
          allowance before using anything here in a letter.
        </p>
      </div>
    </div>
  );
}
