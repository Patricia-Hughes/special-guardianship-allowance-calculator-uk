import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_KEY,
  disableAnalytics,
  getMeasurementId,
  loadAnalytics,
  readConsent,
  subscribeToConsent,
  writeConsent,
} from '../lib/analytics';

const ID = 'G-TEST123456';
const flag = `ga-disable-${ID}`;
const queue = () =>
  (window.dataLayer ?? []).map((value) => Array.from(value as ArrayLike<unknown>));

beforeEach(() => {
  window.localStorage.clear();
  writeConsent('unset');
  window.SGO_GOOGLE_CONFIG = { ga4MeasurementId: ID };
  document.getElementById('ga-tag')?.remove();
  delete window.dataLayer;
  delete window.gtag;
  delete (window as unknown as Record<string, unknown>)[flag];
  window.history.replaceState({}, '', '/');
});
afterEach(() => vi.restoreAllMocks());

describe('Google Analytics consent', () => {
  it('does not load without consent or with an unreplaced placeholder', () => {
    loadAnalytics();
    expect(document.getElementById('ga-tag')).toBeNull();
    writeConsent('granted');
    for (const id of ['REPLACE_WITH_YOUR_GA4_MEASUREMENT_ID', 'G-MYTAG', '']) {
      window.SGO_GOOGLE_CONFIG = { ga4MeasurementId: id };
      expect(getMeasurementId()).toBe('');
      loadAnalytics();
      expect(document.getElementById('ga-tag')).toBeNull();
    }
    expect(window.dataLayer).toBeUndefined();
  });

  it('queues documented gtag commands once, without query strings or fragments', () => {
    window.history.replaceState({}, '', '/?s=child-age-12#income-2000');
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(
      'https://example.org/rates?private=value#details'
    );
    writeConsent('granted');
    loadAnalytics();
    loadAnalytics();
    expect(document.querySelectorAll('#ga-tag')).toHaveLength(1);
    expect((document.getElementById('ga-tag') as HTMLScriptElement).src).toContain(`id=${ID}`);
    expect(
      window.dataLayer?.every(
        (value) => Object.prototype.toString.call(value) === '[object Arguments]'
      )
    ).toBe(true);
    expect(queue().map((command) => command[0])).toEqual(['js', 'config', 'event']);
    expect(queue()[1]).toEqual([
      'config',
      ID,
      expect.objectContaining({
        send_page_view: false,
        page_location: window.location.origin + '/',
        page_referrer: 'https://example.org/rates',
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      }),
    ]);
    expect(JSON.stringify(queue())).not.toMatch(/child-age|income|private=value|#details/);
  });

  it('resumes after withdrawal without loading a second tag or duplicating the resume event', () => {
    writeConsent('granted');
    loadAnalytics();
    writeConsent('denied');
    disableAnalytics();
    expect((window as unknown as Record<string, unknown>)[flag]).toBe(true);
    loadAnalytics(); // A caller cannot override the stored No.
    expect((window as unknown as Record<string, unknown>)[flag]).toBe(true);
    writeConsent('granted');
    loadAnalytics();
    loadAnalytics();
    expect((window as unknown as Record<string, unknown>)[flag]).toBe(false);
    expect(document.querySelectorAll('#ga-tag')).toHaveLength(1);
    expect(queue().filter((command) => command[0] === 'config')).toHaveLength(1);
    expect(queue().filter((command) => command[1] === 'page_view')).toHaveLength(2);
  });

  it('keeps the visitor choice for this page when storage writes are blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    writeConsent('denied');
    expect(readConsent()).toBe('denied');
    loadAnalytics();
    expect(document.getElementById('ga-tag')).toBeNull();
    writeConsent('granted');
    expect(readConsent()).toBe('granted');
    loadAnalytics();
    expect(document.getElementById('ga-tag')).not.toBeNull();
  });

  it('notifies controls of local changes and a changed answer in another tab', () => {
    const changes: string[] = [];
    const unsubscribe = subscribeToConsent(() => changes.push(readConsent()));
    writeConsent('granted');
    window.localStorage.setItem(CONSENT_KEY, 'denied');
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_KEY, newValue: 'denied' }));
    expect(changes).toEqual(['granted', 'denied']);
    unsubscribe();
    writeConsent('unset');
    expect(changes).toHaveLength(2);
  });
});
