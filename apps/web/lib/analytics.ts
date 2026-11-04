/** Google Analytics loads only after an explicit, remembered Yes. */
export const CONSENT_KEY = 'sgo-analytics-consent';
const CONSENT_EVENT = 'sgo-analytics-consent-change';
export type Consent = 'granted' | 'denied' | 'unset';
let pageConsent: Consent | undefined;

declare global {
  interface Window {
    SGO_GOOGLE_CONFIG?: { ga4MeasurementId?: string; adsenseEnabled?: boolean };
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Read the editable public config after its beforeInteractive script loads. */
export function getMeasurementId(): string {
  if (typeof window === 'undefined') return '';
  const configured = window.SGO_GOOGLE_CONFIG?.ga4MeasurementId;
  const id = typeof configured === 'string' ? configured.trim() : '';
  // Google's example tag and our placeholder must never start tracking.
  return /^G-[A-Z0-9]+$/.test(id) && !['G-MYTAG', 'G-XXXXXXXXXX'].includes(id) ? id : '';
}

export function readConsent(): Consent {
  if (typeof window === 'undefined') return 'unset';
  if (pageConsent !== undefined) return pageConsent;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : 'unset';
  } catch {
    return 'unset';
  }
}

/** Keep this page's choice even when the browser refuses persistent storage. */
export function writeConsent(value: Consent): void {
  pageConsent = value;
  try {
    if (value === 'unset') window.localStorage.removeItem(CONSENT_KEY);
    else window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* The in-memory choice still holds for this page. */
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** Synchronize the banner, privacy controls, and other open tabs. */
export function subscribeToConsent(callback: () => void): () => void {
  const storageChanged = (event: StorageEvent): void => {
    if (event.key !== CONSENT_KEY && event.key !== null) return;
    pageConsent = undefined;
    callback();
  };
  window.addEventListener(CONSENT_EVENT, callback);
  window.addEventListener('storage', storageChanged);
  return () => {
    window.removeEventListener(CONSENT_EVENT, callback);
    window.removeEventListener('storage', storageChanged);
  };
}

function cleanUrl(value: string): string {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin + url.pathname : '';
  } catch {
    return '';
  }
}

function pageDetails(): Record<string, string> {
  return {
    page_location: cleanUrl(window.location.href),
    page_referrer: cleanUrl(document.referrer),
    page_title: document.title,
  };
}

/** One tag per document; withdrawing and granting again also resets opt-out. */
export function loadAnalytics(): void {
  const id = getMeasurementId();
  if (!id || readConsent() !== 'granted') return;
  const flags = window as unknown as Record<string, unknown>;
  const wasDisabled = flags[`ga-disable-${id}`] === true;
  flags[`ga-disable-${id}`] = false;

  if (document.getElementById('ga-tag')) {
    if (wasDisabled) window.gtag?.('event', 'page_view', pageDetails());
    return;
  }

  // Use Google's documented queue format (Arguments objects), and queue the
  // configuration before fetching the script so a fast load cannot race it.
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    window.dataLayer?.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...pageDetails(),
  });
  // Share-link query strings, fragments and calculator answers are excluded.
  window.gtag('event', 'page_view', pageDetails());

  const script = document.createElement('script');
  script.id = 'ga-tag';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/** Google's documented opt-out flag is checked before subsequent hits. */
export function disableAnalytics(): void {
  const id = getMeasurementId();
  if (!id) return;
  (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = true;
}
