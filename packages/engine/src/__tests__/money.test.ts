/** Money arithmetic — spec §10 and the §34 property-test requirement. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  add,
  apportion,
  clampMin0,
  formatMoney,
  max,
  min,
  monthlyToWeekly,
  mul,
  parseMoney,
  pence,
  sub,
  weeklyToAnnual,
  weeklyToMonthly,
} from '../money.js';
import { MoneyError } from '../errors.js';

describe('money', () => {
  it('rejects non-integer pence — the branded type is the point', () => {
    expect(() => pence(12.5)).toThrow(MoneyError);
    expect(() => pence(NaN)).toThrow(MoneyError);
    expect(() => pence(Infinity)).toThrow(MoneyError);
    expect(pence(0)).toBe(0);
  });

  it('parses money at the boundary, once', () => {
    expect(parseMoney('12')).toBe(1200);
    expect(parseMoney('£12')).toBe(1200);
    expect(parseMoney('1,234.56')).toBe(123456);
    expect(parseMoney('1,234.5')).toBe(123450);
    expect(parseMoney(' 0.05 ')).toBe(5);
    expect(parseMoney('')).toBe(0);
  });

  it('rejects more than two decimal places rather than rounding a typo', () => {
    expect(() => parseMoney('12.567')).toThrow(MoneyError);
    expect(() => parseMoney('twelve')).toThrow(MoneyError);
    expect(() => parseMoney('-5')).toThrow(MoneyError);
  });

  it('adds, subtracts and clamps', () => {
    expect(add(pence(100), pence(250))).toBe(350);
    expect(add()).toBe(0);
    expect(sub(pence(100), pence(250))).toBe(-150);
    expect(clampMin0(pence(-150))).toBe(0);
    expect(max(pence(1), pence(2))).toBe(2);
    expect(min(pence(1), pence(2))).toBe(1);
  });

  it('multiplies half-up', () => {
    expect(mul(pence(100), 0.8)).toBe(80);
    expect(mul(pence(101), 0.5)).toBe(51); // 50.5 → 51, not 50
    expect(mul(pence(2675), 1)).toBe(2675);
    expect(() => mul(pence(100), NaN)).toThrow(MoneyError);
  });

  it('converts weekly/monthly by × 52 / 12, not × 4 or × 4.33', () => {
    expect(weeklyToMonthly(pence(25500))).toBe(110500);
    expect(monthlyToWeekly(pence(110500))).toBe(25500);
    expect(weeklyToAnnual(pence(25500))).toBe(1326000);
    // Not the naive alternatives.
    expect(weeklyToMonthly(pence(25500))).not.toBe(25500 * 4);
  });

  it('formats en-GB, showing pence only when there are any', () => {
    expect(formatMoney(pence(25500))).toBe('£255');
    expect(formatMoney(pence(25550))).toBe('£255.50');
    expect(formatMoney(pence(25500), { showPence: true })).toBe('£255.00');
  });

  it('apportions exactly — largest remainder, deterministic', () => {
    expect(apportion(pence(10), [1, 1, 1])).toEqual([4, 3, 3]);
    expect(apportion(pence(0), [1, 2])).toEqual([0, 0]);
    expect(apportion(pence(100), [])).toEqual([]);
    // All-zero weights must still not drop the total.
    expect(apportion(pence(7), [0, 0]).reduce((a, b) => a + b, 0)).toBe(7);
  });

  it('apportion loses no penny for any input (property)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000_000 }),
        fc.array(fc.integer({ min: 0, max: 10_000_000 }), { minLength: 1, maxLength: 12 }),
        (total, weights) => {
          const shares = apportion(pence(total), weights);
          return shares.reduce((a, b) => a + b, 0) === total;
        },
      ),
      { numRuns: 2000 },
    );
  });

  it('round-trips a parsed string through formatting', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99_999_999 }), (p) => {
        const formatted = formatMoney(pence(p), { showPence: true });
        return parseMoney(formatted) === p;
      }),
      { numRuns: 1000 },
    );
  });
});
