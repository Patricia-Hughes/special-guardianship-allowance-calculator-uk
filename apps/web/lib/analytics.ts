/**
 * Google Analytics, behind consent.
 *
 * Nothing here runs unless two things are true: a measurement ID was supplied
 * at build time, and the reader has actively agreed. There is no consent mode,
 * no "denied" default that still phones home, and no script tag in the HTML.
 * The tag is injected by JavaScript after the reader presses Yes, and never
 * otherwise.
 *
 * That is stricter than most implementations because of who uses this site.
 * People arrive here describing a child in their care, their benefits and their
 * income, at a hard moment. Consent has to mean what it says.
 */

/** Set at build time. Absent means the whole feature is off, banner included. */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? '';

/** Whether this build carries analytics at all. */
export const ANALYTICS_CONFIGURED = GA_MEASUREMENT_ID.length > 0;

/** Where the reader's answer is kept. Their browser, nowhere else. */
export const CONSENT_KEY = 'sgo-analytics-consent';

export type Consent = 'granted' | 'denied' | 'unset';

/**
 * Read the stored answer.
 *
 * Every access is wrapped: a browser with site data blocked throws on the
 * property itself, and a reader who has blocked storage must still get a
 * working site, not a blank one.
 */
export function readConsent(): Consent {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : 'unset';
  } catch {
    return 'unset';
  }
}

/** Record the answer. Failing to store it is not an error worth showing. */
export function writeConsent(value: Consent): void {
  try {
    if (value === 'unset') window.localStorage.removeItem(CONSENT_KEY);
    else window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage blocked: the choice holds for this page view only */
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Inject the Google tag. Called only from the consent flow.
 *
 * Idempotent: pressing Yes twice, or a re-render, must not load it twice.
 */
export function loadAnalytics(): void {
  if (!ANALYTICS_CONFIGURED) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById('ga-tag')) return;

  const s = document.createElement('script');
  s.id = 'ga-tag';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  // No advertising features, and no automatic capture of the query string: a
  // shared result link carries the child's ages, and that is not Google's.
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: window.location.origin + window.location.pathname,
  });
}

/**
 * Undo consent within the current page view.
 *
 * Removing the tag cannot un-send what was already sent, so this also sets the
 * documented opt-out flag, which the loaded tag checks before every hit.
 */
export function disableAnalytics(): void {
  if (!ANALYTICS_CONFIGURED) return;
  if (typeof window === 'undefined') return;
  (window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
}
