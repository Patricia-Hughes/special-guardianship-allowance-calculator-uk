/**
 * URL state — spec §22. [HARD R8] Financial data must never reach a URL.
 */

import { describe, expect, it } from 'vitest';
import { fromQueryString, toQueryString } from '../lib/urlState';

describe('URL state', () => {
  it('builds the shareable query string from the spec example', () => {
    expect(
      toQueryString({
        nation: 'england',
        region: 'south-east',
        la: 'kent',
        ages: [12, 7],
        formerFosterCarer: true,
      }),
    ).toBe('?n=england&r=south-east&la=kent&c=12%2C7&ff=1');
  });

  it('round-trips', () => {
    const state = {
      nation: 'england' as const,
      region: 'london' as const,
      la: 'camden',
      ages: [3, 14],
      disability: [1],
      formerFosterCarer: true,
    };
    expect(fromQueryString(toQueryString(state))).toEqual(state);
  });

  it('carries nothing sensitive, whatever it is handed', () => {
    // The type system forbids it, so this guards the runtime shape too: the
    // serialiser reads only the fields it knows about.
    const qs = toQueryString({
      nation: 'england',
      ages: [10],
      // @ts-expect-error — deliberately passing fields that must never serialise
      netEarnings: 300000,
      onMeansTestedBenefits: true,
      postcode: 'SW1A 1AA',
      previousWeeklyFosteringAllowance: 30000,
    });
    expect(qs).toBe('?n=england&c=10');
    for (const forbidden of ['300000', 'SW1A', 'postcode', 'earnings', 'benefit', '30000']) {
      expect(qs.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it('ignores anything malformed rather than trusting it', () => {
    expect(fromQueryString('?n=narnia')).toEqual({});
    expect(fromQueryString('?r=middle-earth')).toEqual({});
    expect(fromQueryString('?la=../../etc/passwd')).toEqual({});
    expect(fromQueryString('?la=<script>')).toEqual({});
    expect(fromQueryString('?c=99,-1,abc')).toEqual({});
    expect(fromQueryString('?c=12,abc,7')).toEqual({ ages: [12, 7] });
    expect(fromQueryString('?ff=maybe')).toEqual({});
  });

  it('caps the number of children a link can claim', () => {
    const many = Array.from({ length: 40 }, () => 5).join(',');
    expect(fromQueryString(`?c=${many}`).ages).toHaveLength(10);
  });

  it('returns an empty string for empty state', () => {
    expect(toQueryString({})).toBe('');
  });
});
