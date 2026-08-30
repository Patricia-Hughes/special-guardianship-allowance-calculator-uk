/**
 * Dates and financial years — spec §11 [HARD].
 *
 * Two uprating calendars collide and this is the most likely source of a silent
 * wrong answer:
 *
 *   Fostering NMA / SG allowance rates  → change on 1 April (financial year)
 *   Child Benefit, Guardian's Allowance,
 *   Carer's Allowance, UC, Income Support → change in the first full week of
 *                                           April, ~6 April (benefit year)
 *
 * So between 1 and 6 April, NEW allowance rates coexist with OLD benefit rates.
 * Rate tables and benefit tables are therefore two independent lookups with
 * independent effective dates. Never assume one file's financial year implies
 * the other's.
 *
 * Timezone: UTC only. A user in BST computing "today" at 00:30 on 1 April must
 * not get the previous financial year.
 */

import { DataError } from './errors.js';
import type { BenefitTable, IsoDate, RateTable } from './types.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isoDate(s: string): IsoDate {
  if (!ISO_DATE.test(s)) throw new DataError(`Not an ISO date (YYYY-MM-DD): "${s}"`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw new DataError(`Not a real calendar date: "${s}"`);
  }
  return s as IsoDate;
}

/** Today in UTC, as YYYY-MM-DD. */
export function todayUtc(now: Date = new Date()): IsoDate {
  return now.toISOString().slice(0, 10) as IsoDate;
}

/** ISO dates sort lexicographically, so plain string comparison is correct here. */
export const onOrAfter = (a: IsoDate, b: IsoDate): boolean => a >= b;
export const onOrBefore = (a: IsoDate, b: IsoDate): boolean => a <= b;

/**
 * Select the rate table covering `asAt`.
 * Throws rather than falling back — an out-of-range date must never silently
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
 * Select the benefit table for `asAt`. INDEPENDENT of the rate table (§11).
 * Benefit tables have no end date: the newest one that has come into force wins.
 */
export function selectBenefitTable(tables: BenefitTable[], asAt: IsoDate): BenefitTable {
  const eligible = tables.filter((t) => asAt >= t.effectiveFrom);
  if (eligible.length === 0) throw new DataError(`No benefit table effective on ${asAt}`);
  const sorted = [...eligible].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return sorted[0] as BenefitTable;
}

/** Age at a given date. Not age today. Matters for backdating. */
export function ageAt(dob: IsoDate, at: IsoDate): number {
  const d = new Date(`${dob}T00:00:00Z`);
  const a = new Date(`${at}T00:00:00Z`);
  let age = a.getUTCFullYear() - d.getUTCFullYear();
  const m = a.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && a.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

/** Add whole months in UTC, clamping to the end of a shorter target month. */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10) as IsoDate;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10) as IsoDate;
}

/** Whole months between two dates, floored. */
export function monthsBetween(from: IsoDate, to: IsoDate): number {
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months--;
  return months;
}

/** Whole days between two dates. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** The financial year label ('2026-27') containing a date. FY starts 1 April. */
export function financialYearOf(date: IsoDate): string {
  const d = new Date(`${date}T00:00:00Z`);
  const y = d.getUTCFullYear();
  const startYear = d.getUTCMonth() >= 3 ? y : y - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/** Every 1 April strictly after `from` and on or before `to`. */
export function financialYearBoundaries(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  let year = new Date(`${from}T00:00:00Z`).getUTCFullYear();
  for (;;) {
    const boundary = `${year}-04-01` as IsoDate;
    if (boundary > to) break;
    if (boundary > from) out.push(boundary);
    year++;
    if (year > 3000) break; /* c8 ignore next */
  }
  return out;
}

/**
 * Dates within (from, to] on which the child moves into a new age band.
 * A child crossing an age band mid-year changes the rate, so backdating must
 * segment at each one.
 */
export function ageBandChangeDates(
  dob: IsoDate,
  from: IsoDate,
  to: IsoDate,
  bands: ReadonlyArray<{ minAge: number; maxAge: number }>,
): IsoDate[] {
  const boundaryAges = new Set<number>();
  for (const b of bands) boundaryAges.add(b.minAge);
  const out: IsoDate[] = [];
  for (const age of [...boundaryAges].sort((a, b) => a - b)) {
    if (age === 0) continue;
    const birthday = nthBirthday(dob, age);
    if (birthday > from && birthday <= to) out.push(birthday);
  }
  return out.sort();
}

/** The date the child turns `age`. 29 February births roll to 1 March in common years. */
export function nthBirthday(dob: IsoDate, age: number): IsoDate {
  const d = new Date(`${dob}T00:00:00Z`);
  const targetYear = d.getUTCFullYear() + age;
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const lastDay = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
  if (day > lastDay) {
    return new Date(Date.UTC(targetYear, month + 1, 1)).toISOString().slice(0, 10) as IsoDate;
  }
  return new Date(Date.UTC(targetYear, month, day)).toISOString().slice(0, 10) as IsoDate;
}
