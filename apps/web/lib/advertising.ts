/** Optional advertising on editorial pages. The calculator never loads this service. */
export const ADSENSE_PUBLISHER = 'ca-pub-4267137695035041';
export type AdvertisingStatus = 'off' | 'loading' | 'ready' | 'unavailable';

interface TcData {
  eventStatus?: string;
  cmpStatus?: string;
  gdprApplies?: boolean;
  tcString?: string;
  listenerId?: number;
  purpose?: { consents?: Record<number, boolean> };
  vendor?: { consents?: Record<number, boolean> };
  publisher?: { restrictions?: Record<number, Record<number, number>> };
}
type TcfCallback = (data: TcData, success: boolean) => void;

declare global {
  interface Window {
    __tcfapi?: (command: string, version: number, callback: TcfCallback, parameter?: number) => void;
    googlefc?: {
      callbackQueue?: Array<Record<string, () => void>>;
      showRevocationMessage?: () => void;
    };
  }
}

const STATUS_EVENT = 'sgo-advertising-status';
let status: AdvertisingStatus = 'off';

export function advertisingStatus(): AdvertisingStatus { return status; }
function setStatus(next: AdvertisingStatus): void {
  status = next;
  window.dispatchEvent(new Event(STATUS_EVENT));
}
export function subscribeAdvertising(callback: () => void): () => void {
  window.addEventListener(STATUS_EVENT, callback);
  return () => window.removeEventListener(STATUS_EVENT, callback);
}

export function editorialPage(url: URL): boolean {
  return !url.search && !url.hash &&
    (url.pathname === '/rates' || url.pathname === '/guidance' ||
      /^\/guidance\/[a-z0-9-]+$/.test(url.pathname));
}

/**
 * This is an additional conservative gate, not a replacement for Google's
 * certified CMP. AdSense itself interprets the CMP's complete TCF signal.
 * Missing, failed or unfinished signals never authorize an ad request.
 */
function mayLoadAds(data: TcData, success: boolean): boolean {
  return success && data.cmpStatus === 'loaded' &&
    ['tcloaded', 'useractioncomplete'].includes(data.eventStatus ?? '') &&
    typeof data.gdprApplies === 'boolean' &&
    typeof data.tcString === 'string' && data.tcString.length > 0 &&
    data.purpose?.consents?.[1] === true && data.vendor?.consents?.[755] === true &&
    data.publisher?.restrictions?.[1]?.[755] !== 0;
}

function loadAdSense(): void {
  if (!editorialPage(new URL(window.location.href)) || document.getElementById('sgo-adsense')) return;
  const script = document.createElement('script');
  script.id = 'sgo-adsense';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER}`;
  document.head.appendChild(script);
}

export function openAdvertisingPreferences(): boolean {
  if (status !== 'ready' || !window.googlefc?.showRevocationMessage) return false;
  window.googlefc.showRevocationMessage();
  return true;
}

/** Start only after the owner has published and verified the certified message. */
export function startAdvertising(): () => void {
  const url = new URL(window.location.href);
  const privacy = url.pathname === '/privacy' && !url.search && !url.hash;
  if (window.SGO_GOOGLE_CONFIG?.adsenseEnabled !== true) {
    setStatus('off');
    return () => {};
  }
  if (!editorialPage(url) && !privacy) {
    setStatus('unavailable');
    return () => {};
  }
  setStatus('loading');
  let active = true;
  let listenerId: number | undefined;
  let listening = false;
  const onConsent: TcfCallback = (data, success) => {
    if (!active) return;
    listenerId = data.listenerId ?? listenerId;
    if (!success || data.cmpStatus === 'error') {
      setStatus('unavailable');
      return;
    }
    if (data.cmpStatus !== 'loaded') return;
    setStatus(window.googlefc?.showRevocationMessage ? 'ready' : 'unavailable');
    if (mayLoadAds(data, success) && editorialPage(new URL(window.location.href))) {
      loadAdSense();
    } else if (data.eventStatus === 'useractioncomplete' && document.getElementById('sgo-adsense')) {
      // Removing a script cannot stop code it already executed. A fresh document
      // rereads the CMP's saved refusal before any ad script can be requested.
      window.location.reload();
    }
  };
  const connect = (): void => {
    if (!active || listening || !window.__tcfapi) return;
    listening = true;
    try {
      window.__tcfapi('addEventListener', 2, onConsent);
    } catch {
      setStatus('unavailable');
    }
  };
  const interval = window.setInterval(connect, 250);
  const timeout = window.setTimeout(() => {
    window.clearInterval(interval);
    if (status === 'loading') setStatus('unavailable');
  }, 30_000);
  window.googlefc = window.googlefc ?? {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue ?? [];
  const readyCallback = { CONSENT_API_READY: connect };
  window.googlefc.callbackQueue.push(readyCallback);
  if (!document.getElementById('sgo-certified-cmp')) {
    const script = document.createElement('script');
    script.id = 'sgo-certified-cmp';
    script.async = true;
    script.src = 'https://fundingchoicesmessages.google.com/i/pub-4267137695035041?ers=1';
    script.onerror = () => { if (active) setStatus('unavailable'); };
    document.head.appendChild(script);
  }
  connect();
  return () => {
    active = false;
    window.clearInterval(interval);
    window.clearTimeout(timeout);
    if (listenerId !== undefined) window.__tcfapi?.('removeEventListener', 2, () => {}, listenerId);
    if (window.googlefc?.callbackQueue) {
      window.googlefc.callbackQueue = window.googlefc.callbackQueue.filter((item) => item !== readyCallback);
    }
  };
}
