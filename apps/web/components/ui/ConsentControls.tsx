'use client';

import { useAnalyticsConsent } from './useAnalyticsConsent';

/**
 * Changing your mind, on the privacy page.
 *
 * Withdrawing consent has to be as easy as giving it, so this shows the current
 * answer in words and offers the opposite one. It is the same two functions the
 * banner uses, not a second implementation that could drift.
 */
export function ConsentControls() {
  const { consent, configured, answer } = useAnalyticsConsent();
  if (configured === null || consent === null) return null;
  if (!configured) return <p>Analytics are currently off on this site.</p>;

  const said = {
    granted: 'You have said yes to analytics cookies.',
    denied: 'You have said no to analytics cookies. Nothing is being counted.',
    unset: 'You have not answered yet. Nothing is being counted until you do.',
  }[consent];

  return (
    <div className="consent-controls">
      <p>
        <strong>Your choice on this device:</strong> {said}
      </p>
      <div className="btn-row">
        {consent !== 'granted' && (
          <button type="button" className="btn" onClick={() => answer('granted')}>
            Turn analytics on
          </button>
        )}
        {consent !== 'denied' && (
          <button type="button" className="btn btn--secondary" onClick={() => answer('denied')}>
            Turn analytics off
          </button>
        )}
      </div>
      <p className="hint">
        Turning it off stops any further counting straight away. Anything already counted has gone
        to Google; turning analytics off cannot remove past data.
      </p>
    </div>
  );
}
