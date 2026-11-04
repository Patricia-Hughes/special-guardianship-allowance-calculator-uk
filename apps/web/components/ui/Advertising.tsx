'use client';

import { useEffect, useState } from 'react';
import type { AdvertisingStatus } from '../../lib/advertising';

export function Advertising() {
  useEffect(() => {
    if (window.SGO_GOOGLE_CONFIG?.adsenseEnabled !== true) return;
    // The disabled feature adds no consent/ad runtime to the page download.
    // Calculator pages do not need to download that runtime even when enabled.
    const url = new URL(window.location.href);
    if (url.search || url.hash || !/^\/(privacy|rates|guidance(?:\/[a-z0-9-]+)?)$/.test(url.pathname)) return;
    let active = true;
    let stop: (() => void) | undefined;
    void import('../../lib/advertising').then((advertising) => {
      if (active) stop = advertising.startAdvertising();
    }).catch(() => {
      // A failed optional runtime download must not interrupt the page.
    });
    return () => { active = false; stop?.(); };
  }, []);
  return null;
}

export function AdvertisingPreferences() {
  const [status, setStatus] = useState<AdvertisingStatus>('off');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (window.SGO_GOOGLE_CONFIG?.adsenseEnabled !== true) return;
    setStatus('loading');
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void import('../../lib/advertising').then((advertising) => {
      if (!active) return;
      const update = () => setStatus(advertising.advertisingStatus());
      unsubscribe = advertising.subscribeAdvertising(update);
      update();
      if (window.location.search || window.location.hash) setStatus('unavailable');
    }).catch(() => {
      if (active) setStatus('unavailable');
    });
    return () => { active = false; unsubscribe?.(); };
  }, []);
  return (
    <div>
      <p role="status">
        {status === 'off' && 'Advertising is currently off on this site.'}
        {status === 'loading' && 'Loading advertising privacy choices.'}
        {status === 'ready' && 'You can review or withdraw advertising consent here.'}
        {status === 'unavailable' && 'Advertising privacy choices are unavailable. No ads are loaded on this page.'}
      </p>
      {status === 'ready' && (
        <button type="button" className="btn btn--secondary" onClick={async () => {
          const advertising = await import('../../lib/advertising');
          setFailed(!advertising.openAdvertisingPreferences());
        }}>Change advertising choices</button>
      )}
      {failed && <p role="alert">The privacy choices could not be opened. Please reload this page and try again.</p>}
    </div>
  );
}
