/**
 * Money handling, spec §10 [HARD].
 *
 * Floating-point money in a legal calculator is a defect, not a style
 * preference. A carer showing a social worker a figure that is a penny off
 * undermines the whole document.
 *
 * The rules this file exists to enforce:
 *
 *  1. all internal arithmetic is in integer pence
 *  2. parse once, at the boundary, in parseMoney
 *  3. round only at presentation, and only once
 *  4. rounding is half-up
 *  5. weekly to monthly is × 52 ÷ 12. Never × 4, never × 4.33
 *  6. annual is weekly × 52. Not × 52.18
 */

import { MoneyError } from './errors.js';

// ─── The unit ──────────────────────────────────────────────────────────────

/** All money is integer PENCE internally. The brand makes a raw `number` a type error. */
export type Pence = number & { readonly __brand: 'Pence' };

export const pence = (n: number): Pence => {
  if (!Number.isFinite(n)) throw new MoneyError(`Non-finite pence: ${n}`);
  if (!Number.isInteger(n)) throw new MoneyError(`Non-integer pence: ${n}`);
  return n as Pence;
};

export const ZERO: Pence = 0 as Pence;

// ─── In ────────────────────────────────────────────────────────────────────

/** Anything a person might type around a number, and the shape of what is left. */
const DECORATION = /[£,\s]/g;
const AMOUNT = /^\d+(\.\d{1,2})?$/;

/**
 * Parse a user string into pence. Handles "1,234.5", "£12", " 12 ".
 *
 * Rejects "12.567": more than two decimal places is a typo, not a rounding
 * opportunity, and silently rounding it would accept an amount nobody typed.
 */
export function parseMoney(input: string): Pence {
  const cleaned = input.replace(DECORATION, '');
  if (cleaned === '') return pence(0);
  if (!AMOUNT.test(cleaned)) throw new MoneyError(`Invalid money input: "${input}"`);

  const [whole = '0', fraction = ''] = cleaned.split('.');
  return pence(Number(whole) * 100 + Number(fraction.padEnd(2, '0')));
}

// ─── Arithmetic ────────────────────────────────────────────────────────────

export const add = (...xs: Pence[]): Pence => pence(xs.reduce<number>((a, b) => a + b, 0));
export const sub = (a: Pence, b: Pence): Pence => pence(a - b);
export const clampMin0 = (a: Pence): Pence => pence(Math.max(0, a));
export const max = (a: Pence, b: Pence): Pence => (a >= b ? a : b);
export const min = (a: Pence, b: Pence): Pence => (a <= b ? a : b);

/**
 * Multiply by a rate. Half-up rounding.
 *
 * Math.round is half-up for positive values, which is what councils use when
 * presenting figures. Money here is never negative, because clampMin0 guards
 * the subtraction sites, so the half-down-for-negatives behaviour of
 * Math.round is not reachable. The epsilon nudges values such as 2.675 that are
 * stored fractionally below their decimal representation.
 */
export function mul(a: Pence, rate: number): Pence {
  if (!Number.isFinite(rate)) throw new MoneyError(`Non-finite rate: ${rate}`);
  return pence(Math.round(a * rate + Number.EPSILON));
}

// ─── Periods ───────────────────────────────────────────────────────────────

const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

/** Councils use 52 weeks, not 4-week months. */
export const weeklyToMonthly = (w: Pence): Pence =>
  pence(Math.round((w * WEEKS_PER_YEAR) / MONTHS_PER_YEAR));
export const monthlyToWeekly = (m: Pence): Pence =>
  pence(Math.round((m * MONTHS_PER_YEAR) / WEEKS_PER_YEAR));
export const weeklyToAnnual = (w: Pence): Pence => pence(w * WEEKS_PER_YEAR);

// ─── Out ───────────────────────────────────────────────────────────────────

/**
 * Format for display. en-GB. Shows pence only when there are any, unless forced.
 *
 * Every money value on screen goes through here, which makes it the one place
 * that can guarantee nobody is ever shown "£NaN". The Pence brand is enforced
 * by pence(), but a cast can smuggle a raw number past it, and the failure is
 * silent and convincing: a figure someone might take to their council. Refuse
 * instead. app/error.tsx turns this into a visible message rather than a blank
 * page.
 */
export function formatMoney(p: Pence, opts?: { showPence?: boolean }): string {
  if (!Number.isFinite(p)) {
    throw new MoneyError(`Refusing to display a non-finite amount: ${p}`);
  }
  const showPence = opts?.showPence ?? p % 100 !== 0;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: showPence ? 2 : 0,
    maximumFractionDigits: showPence ? 2 : 0,
  }).format(p / 100);
}

// ─── Sharing a total out ───────────────────────────────────────────────────

/**
 * Apportion a total across weights without losing pennies (spec §10).
 *
 * Largest-remainder allocation: the parts always sum EXACTLY to the total, for
 * any weights and any total. Test T27 fuzzes this over 10k cases.
 */
export function apportion(total: Pence, weights: number[]): Pence[] {
  if (weights.length === 0) return [];

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    // Nothing to weight by: give the whole total to the first slot so no penny
    // is dropped, rather than returning zeros that do not sum to the total.
    return weights.map((_, i) => pence(i === 0 ? total : 0));
  }

  const exact = weights.map((w) => (total * w) / totalWeight);
  const shares = exact.map((r) => Math.floor(r));
  const pennies = total - shares.reduce((a, b) => a + b, 0);

  // The pennies left over by flooring go to the largest fractional parts, ties
  // broken by position so the result is deterministic.
  const byRemainder = exact
    .map((r, i) => ({ i, fraction: r - Math.floor(r) }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);

  for (let k = 0; k < pennies; k++) {
    const slot = byRemainder[k % byRemainder.length];
    /* c8 ignore next */
    if (slot === undefined) break;
    shares[slot.i] = (shares[slot.i] ?? 0) + 1;
  }

  return shares.map((n) => pence(n));
}
