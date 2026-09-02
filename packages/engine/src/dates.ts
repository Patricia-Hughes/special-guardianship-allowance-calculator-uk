/**
 * Dates and financial years, spec §11 [HARD].
 *
 * Two uprating calendars collide, and this is the most likely source of a
 * silent wrong answer:
 *
 *   fostering NMA and SG allowance rates    change on 1 April, the financial year
 *   Child Benefit, Guardian's Allowance,    change in the first full week of
 *   Carer's Allowance, UC, Income Support   April, around 6 April, the benefit year
 *
 * So between 1 and 6 April, NEW allowance rates coexist with OLD benefit rates.
 * Rate tables and benefit tables are therefore two independent lookups with
 * independent effective dates. Never assume one file's financial year implies
 * the other's.
 *
 * Everything here is UTC. A user in BST computing "today" at 00:30 on 1 April
 * must not get the previous financial year.
 */

import { DataError } from './errors.js';
import type { BenefitTable, IsoDate, RateTable } from './types.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;
const MONTHS_PER_YEAR = 12;
/** The financial year starts on 1 April, which is month 3 counting from zero. */
const APRIL = 3;

// ─── Building and reading dates ────────────────────────────────────────────

/** Parse a date at UTC midnight. Every date in this file goes through here. */
const utc = (date: IsoDate): Date => new Date(`${date}T00:00:00Z`);

const toIso = (d: Date): IsoDate => d.toISOString().slice(0, 10) as IsoDate;

export function isoDate(s: string): IsoDate {
  if (!ISO_DATE.test(s)) throw new DataError(`Not an ISO date (YYYY-MM-DD): "${s}"`);
  const d = new Date(`${s}T00:00:00Z`);
  // Round-tripping catches 2026-02-30, which Date happily rolls into March.
  if (Number.isNaN(d.getTime()) || toIso(d) !== s) {
    throw new DataError(`Not a real calendar date: "${s}"`);
  }
  return s as IsoDate;
}

/** Today in UTC, as YYYY-MM-DD. */
export function todayUtc(now: Date = new Date()): IsoDate {
  return toIso(now);
}

/** ISO dates sort lexicographically, so plain string comparison is correct here. */
export const onOrAfter = (a: IsoDate, b: IsoDate): boolean => a >= b;
export const onOrBefore = (a: IsoDate, b: IsoDate): boolean => a <= b;

// ─── Choosing a table ──────────────────────────────────────────────────────

/**
 * The rate table covering `asAt`.
 *
 * Throws rather than falling back: an out-of-range date must never silently
 * borrow another year's figures.
 */
export function selectRateTable(tables: RateTable[], asAt: IsoDate): RateTable {
  const match = tables.find((t) => asAt >= t.effectiveFrom && asAt <= t.effectiveTo);
  if (!match) throw new DataError(`No rate table effective on ${asAt}`);
  if (match.status === 'PENDING_SOURCE') {
    throw new DataError(`Rate table for ${match.financialYear} is not yet sourced`);
  }
  return match;
}

/**
 * The benefit table for `asAt`. INDEPENDENT of the rate table (§11).
 *
 * Benefit tables have no end date, so the newest one that has come into force
 * wins rather than the one whose range contains the date.
 */
export function selectBenefitTable(tables: BenefitTable[], asAt: IsoDate): BenefitTable {
  const inForce = tables
    .filter((t) => asAt >= t.effectiveFrom)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  if (inForce.length === 0) throw new DataError(`No benefit table effective on ${asAt}`);
  return inForce[0] as BenefitTable;
}

// ─── Arithmetic ────────────────────────────────────────────────────────────

/** Age at a given date. Not age today: this is what makes backdating correct. */
export function ageAt(dob: IsoDate, at: IsoDate): number {
  const born = utc(dob);
  const on = utc(at);
  let age = on.getUTCFullYear() - born.getUTCFullYear();
  const months = on.getUTCMonth() - born.getUTCMonth();
  if (months < 0 || (months === 0 && on.getUTCDate() < born.getUTCDate())) age--;
  return age;
}

/** Add whole months in UTC, clamping to the end of a shorter target month. */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = utc(date);
  const day = d.getUTCDate();
  // Move to the 1st first, so adding a month to the 31st cannot overflow into
  // the month after the one intended.
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return toIso(d);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** Whole months between two dates, floored. */
export function monthsBetween(from: IsoDate, to: IsoDate): number {
  const a = utc(from);
  const b = utc(to);
  const months =
    (b.getUTCFullYear() - a.getUTCFullYear()) * MONTHS_PER_YEAR +
    (b.getUTCMonth() - a.getUTCMonth());
  return b.getUTCDate() < a.getUTCDate() ? months - 1 : months;
}

/** Whole days between two dates. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / MS_PER_DAY);
}

// ─── Financial years ───────────────────────────────────────────────────────

/** The financial year label ("2026-27") containing a date. The year starts 1 April. */
export function financialYearOf(date: IsoDate): string {
  const d = utc(date);
  const year = d.getUTCFullYear();
  const startYear = d.getUTCMonth() >= APRIL ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/** Every 1 April strictly after `from` and on or before `to`. */
export function financialYearBoundaries(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let year = utc(from).getUTCFullYear(); ; year++) {
    const boundary = `${year}-04-01` as IsoDate;
    if (boundary > to) break;
    if (boundary > from) out.push(boundary);
    /* c8 ignore next */
    if (year > 3000) break;
  }
  return out;
}

// ─── Age bands ─────────────────────────────────────────────────────────────

/**
 * Dates within (from, to] on which the child moves into a new age band.
 *
 * A child crossing an age band mid-year changes the rate, so backdating has to
 * cut a segment at each one or it pays the whole period at one rate.
 */
export function ageBandChangeDates(
  dob: IsoDate,
  from: IsoDate,
  to: IsoDate,
  bands: ReadonlyArray<{ minAge: number; maxAge: number }>,
): IsoDate[] {
  const ages = [...new Set(bands.map((b) => b.minAge))].sort((a, b) => a - b);
  return ages
    .filter((age) => age !== 0)
    .map((age) => nthBirthday(dob, age))
    .filter((birthday) => birthday > from && birthday <= to)
    .sort();
}

/** The date the child turns `age`. 29 February births roll to 1 March in common years. */
export function nthBirthday(dob: IsoDate, age: number): IsoDate {
  const born = utc(dob);
  const year = born.getUTCFullYear() + age;
  const month = born.getUTCMonth();
  const day = born.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return day > lastDay
    ? toIso(new Date(Date.UTC(year, month + 1, 1)))
    : toIso(new Date(Date.UTC(year, month, day)));
}
