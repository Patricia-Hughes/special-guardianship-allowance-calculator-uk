'use client';

import { useMemo, useRef, useState } from 'react';
import { LA_NAMES, LA_REGION_MAP, type EnglandRegion } from '@sgo/engine';

/**
 * Council picker, spec §12, route 1 (the most reliable, and the default path).
 *
 * A native <datalist>-free, ARIA-compliant combobox would be a lot of JS for
 * this budget; a labelled <select> with all 153 authorities is fully keyboard
 * operable, announces its option count natively in every screen reader, works
 * with JS disabled, and costs nothing. That is the better trade for this
 * audience, see docs/DECISIONS.md.
 *
 * The postcode route (§12 route 2) sits alongside it and degrades silently to
 * the manual region picker if it fails.
 */
export function CouncilPicker({
  value,
  onChange,
  postcodeLookupEnabled,
}: {
  value: string;
  onChange: (slug: string, region: EnglandRegion | null) => void;
  postcodeLookupEnabled: boolean;
}) {
  const [postcode, setPostcode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const statusRef = useRef<HTMLParagraphElement>(null);

  const councils = useMemo(
    () =>
      Object.keys(LA_REGION_MAP)
        .map((slug) => ({ slug, name: LA_NAMES[slug] ?? slug }))
        .sort((a, b) => a.name.localeCompare(b.name, 'en-GB')),
    [],
  );

  /**
   * [HARD R8] Fires only on explicit user action, never on keystroke. Sends
   * only the outward code, enough for district resolution, and less
   * identifying than a full postcode. The result is used and discarded: the
   * postcode is never stored, logged, or put in the URL.
   */
  async function findMyCouncil(): Promise<void> {
    const outward = postcode.trim().split(/\s+/)[0] ?? '';
    if (!outward) {
      setStatus('Enter a postcode, or choose your council from the list.');
      return;
    }
    setLooking(true);
    setStatus('Looking up your council…');
    try {
      const res = await fetch(
        `https://api.postcodes.io/outcodes/${encodeURIComponent(outward)}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) throw new Error('lookup failed');
      const body = (await res.json()) as { result?: { admin_district?: string[] } };
      const districts = body.result?.admin_district ?? [];
      const match = districts
        .map((d) => d.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
        .find((slug) => slug in LA_REGION_MAP);
      if (!match) {
        setStatus("We couldn't match that postcode to a council. Choose yours from the list instead.");
        return;
      }
      onChange(match, LA_REGION_MAP[match] ?? null);
      setStatus(`We think your council is ${LA_NAMES[match] ?? match}. Change it below if not.`);
    } catch {
      // Silent fallback to the manual picker. Never block on this (§12, §33).
      setStatus('Choose your council from the list below.');
    } finally {
      setLooking(false);
      statusRef.current?.focus();
    }
  }

  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor="council-select">
          Which council is responsible for your child?
        </label>
        <span className="field__hint" id="council-hint">
          This is usually the county or city council, not a district council. If you are not sure,
          you can skip this and pick a region instead.
        </span>
        <select
          id="council-select"
          name="council"
          value={value}
          aria-describedby="council-hint"
          onChange={(e) => {
            const slug = e.target.value;
            onChange(slug, slug ? (LA_REGION_MAP[slug] ?? null) : null);
          }}
        >
          <option value="">Choose a council…</option>
          {councils.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {postcodeLookupEnabled && (
        <details>
          <summary>Or find it from your postcode</summary>
          <div className="field">
            <label className="field__label" htmlFor="postcode">
              Postcode
            </label>
            <span className="field__hint" id="postcode-hint">
              We only send the first part (like SW1A). We do not store it, log it, or put it in the
              web address. Nothing else you have typed is sent with it.
            </span>
            <input
              id="postcode"
              name="postcode"
              type="text"
              autoComplete="postal-code"
              value={postcode}
              aria-describedby="postcode-hint"
              onChange={(e) => setPostcode(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn--secondary" onClick={findMyCouncil} disabled={looking}>
            {looking ? 'Looking…' : 'Find my council'}
          </button>
          <p ref={statusRef} tabIndex={-1} aria-live="polite" className="gap-md">
            {status}
          </p>
        </details>
      )}
    </>
  );
}
