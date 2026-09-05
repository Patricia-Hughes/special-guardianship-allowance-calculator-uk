'use client';

import { useEffect, useState } from 'react';
import {
  ANALYTICS_CONFIGURED,
  disableAnalytics,
  loadAnalytics,
  readConsent,
  writeConsent,
  type Consent,
} from '../../lib/analytics';

/**
 * The cookie consent bar.
 *
 * Renders nothing on the server and nothing at all in a build with no
 * measurement ID, so a site without analytics has no banner and nothing to
 * consent to, exactly as before.
 *
 * The reader is asked once. Until they answer, no tag is loaded, which is what
 * makes this consent rather than notice. Both buttons are the same size and
 * the same prominence: a "reject" hidden in small grey text is not a free
 * choice, and this audience is the wrong one to play that game with.
 */
export function ConsentBanner() {
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    if (!ANALYTICS_CONFIGURED) return;
    const stored = readConsent();
    setConsent(stored);
    if (stored === 'granted') loadAnalytics();
  }, []);

  if (!ANALYTICS_CONFIGURED) return null;
  // null means the effect has not run: server render, and the first paint.
  if (consent === null || consent !== 'unset') return null;

  const answer = (value: Exclude<Consent, 'unset'>): void => {
    writeConsent(value);
    setConsent(value);
    if (value === 'granted') loadAnalytics();
    else disableAnalytics();
  };

  return (
    <section className="consent print-hide" aria-label="Cookies on this site">
      <div className="wrap consent__inner">
        <div className="consent__text">
          <p>
            <strong>May I count your visit?</strong> I would like to use Google Analytics to see
            which pages people find useful. It sets cookies and sends Google the pages you look at.
          </p>
          <p className="consent__note">
            Nothing you type into the calculator is ever sent, whichever you choose. Saying no
            changes nothing about how the site works. You can change your mind at any time on the{' '}
            <a href="/privacy">privacy page</a>.
          </p>
        </div>
        <div className="consent__actions">
          <button type="button" className="btn" onClick={() => answer('granted')}>
            Yes, that is fine
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => answer('denied')}>
            No thank you
          </button>
        </div>
      </div>
    </section>
  );
}
