/**
 * Backdating module — spec §16.
 *
 * High value: the Ombudsman has ordered councils to backdate, so "what should I
 * have been paid since the order?" is a real question with real money attached.
 *
 * [HARD] If any segment falls in a financial year whose rate data is
 * PENDING_SOURCE, we do not estimate it. It goes in `blockedYears` and the user
 * sees a partial total with an explicit note. A backdating figure built on a
 * guessed historic rate is worse than no figure — the carer takes it to a
 * complaint and it gets shot down.
 */

import {
  ageAt,
  ageBandChangeDates,
  addDays,
  daysBetween,
  financialYearBoundaries,
  financialYearOf,
  monthsBetween,
  nthBirthday,
} from './dates.js';
import { DataError } from './errors.js';
import { add, clampMin0, mul, pence, sub, type Pence } from './money.js';
import { defaultDeps, lookupRate, resolveAgeBand, type EngineDeps } from './engine.js';
import type { CalculatorInput, IsoDate, RateTable } from './types.js';

export interface BackdatingInput {
  base: CalculatorInput;
  /** Usually the order date. */
  fromDate: IsoDate;
  /** Usually today. */
  toDate: IsoDate;
  /** What the council has been paying. */
  actuallyPaidWeekly: Pence;
}

export type SegmentReason =
  | 'financial-year-change'
  | 'age-band-change'
  | 'period-start'
  | 'period-end'
  | 'reg7-anniversary';

export interface BackdatingSegment {
  from: IsoDate;
  to: IsoDate;
  weeks: number;
  financialYear: string;
  ageBand: string;
  maximumWeekly: Pence;
  shouldHaveBeenPaidWeekly: Pence;
  actuallyPaidWeekly: Pence;
  segmentShortfall: Pence;
  reason: SegmentReason;
}

export interface BackdatingResult {
  segments: BackdatingSegment[];
  totalShouldHaveBeenPaid: Pence;
  totalActuallyPaid: Pence;
  shortfall: Pence;
  yearsCovered: string[];
  /** Financial years with PENDING_SOURCE rate data. Never estimated. */
  blockedYears: string[];
  caveats: string[];
}

export const BACKDATING_CAVEATS: string[] = [
  'This shows the difference against your council\'s lawful maximum, not a guaranteed entitlement.',
  'A council can lawfully pay less after properly assessing your circumstances.',
  'The Ombudsman normally expects complaints within 12 months of you becoming aware, though there is discretion.',
  'Backdating has been ordered in real cases (Devon 2024; North Tyneside 17 002 928).',
];

/**
 * Split the period at every point where the rate could change (§16):
 *   1. each 1 April (financial year boundary)
 *   2. each birthday that crosses an age band boundary
 *   3. the 24-month reg 7 anniversary
 *   4. the start and end of the requested period
 */
export function segmentBoundaries(
  input: BackdatingInput,
  bands: ReadonlyArray<{ minAge: number; maxAge: number }>,
): Array<{ date: IsoDate; reason: SegmentReason }> {
  const { fromDate, toDate, base } = input;
  const points = new Map<string, SegmentReason>();
  points.set(fromDate, 'period-start');

  for (const b of financialYearBoundaries(fromDate, toDate)) {
    if (!points.has(b)) points.set(b, 'financial-year-change');
  }

  for (const child of base.children) {
    const dob = child.dateOfBirth;
    if (!dob) continue;
    for (const d of ageBandChangeDates(dob, fromDate, toDate, bands)) {
      if (!points.has(d)) points.set(d, 'age-band-change');
    }
  }

  if (base.carer.wasFosterCarerForThisChild && base.carer.orderDate) {
    const anniversary = addMonthsIso(base.carer.orderDate, 24);
    if (anniversary > fromDate && anniversary <= toDate && !points.has(anniversary)) {
      points.set(anniversary, 'reg7-anniversary');
    }
  }

  return [...points.entries()]
    .map(([date, reason]) => ({ date: date as IsoDate, reason }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function addMonthsIso(date: IsoDate, months: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10) as IsoDate;
}

function rateTableFor(tables: RateTable[], asAt: IsoDate): RateTable | { blocked: string } {
  const match = tables.find((t) => asAt >= t.effectiveFrom && asAt <= t.effectiveTo);
  if (!match) return { blocked: financialYearOf(asAt) };
  if (match.status === 'PENDING_SOURCE') return { blocked: match.financialYear };
  return match;
}

export function calculateBackdating(
  input: BackdatingInput,
  depsOverride?: Partial<EngineDeps>,
): BackdatingResult {
  const deps: EngineDeps = { ...defaultDeps(), ...depsOverride };
  const { base, fromDate, toDate, actuallyPaidWeekly } = input;
  if (toDate < fromDate) {
    throw new DataError('The end of the backdating period is before its start.');
  }
  if (base.children.length !== 1) {
    // Apportioning a household contribution across a period, per child, with
    // age-band changes at different dates, is not specified. Refuse rather
    // than invent an allocation.
    throw new DataError('Backdating currently supports one child at a time.');
  }
  const child = base.children[0];
  /* c8 ignore next */
  if (!child) throw new DataError('Backdating needs a child.');

  // Age bands come from the CURRENT table; they have been stable across the
  // sourced years and a change would be caught by the data validation gate.
  const currentTable = deps.rateTables.find((t) => t.status !== 'PENDING_SOURCE');
  /* c8 ignore next */
  if (!currentTable) throw new DataError('No sourced rate table available.');
  const bandsSource =
    base.carer.nation === 'england' ? currentTable.england : currentTable[base.carer.nation];
  if (!bandsSource) {
    throw new DataError(`No ${base.carer.nation} rates available for backdating.`);
  }

  const boundaries = segmentBoundaries(input, bandsSource.ageBands);

  const segments: BackdatingSegment[] = [];
  const blockedYears = new Set<string>();
  const yearsCovered = new Set<string>();

  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i];
    /* c8 ignore next */
    if (!start) continue;
    const nextBoundary = boundaries[i + 1];
    // Segments are half-open: [start, nextStart). The displayed `to` is the day
    // before the next segment begins, so the period reads naturally.
    const endExclusive = nextBoundary ? nextBoundary.date : (addDays(toDate, 1) as IsoDate);
    const displayTo = addDays(endExclusive, -1);
    if (displayTo < start.date) continue;

    const days = daysBetween(start.date, endExclusive);
    const weeks = days / 7;

    const table = rateTableFor(deps.rateTables, start.date);
    if ('blocked' in table) {
      blockedYears.add(table.blocked);
      continue;
    }
    yearsCovered.add(table.financialYear);

    // Age at the START of the segment. Segmentation guarantees the band does
    // not change inside a segment (when a date of birth was given).
    const ageAtStart = child.dateOfBirth ? ageAt(child.dateOfBirth, start.date) : child.ageYears;
    const band = resolveAgeBand(
      table,
      base.carer.nation,
      { ...child, ageYears: ageAtStart, dateOfBirth: undefined },
      start.date,
    );
    const maximumWeekly = lookupRate(table, base.carer, band, deps);

    // Within the reg 7 two-year window, a former foster carer's previous
    // allowance is the floor [R4].
    const prev = base.carer.previousWeeklyFosteringAllowance;
    const monthsAtStart = base.carer.orderDate
      ? monthsBetween(base.carer.orderDate, start.date)
      : base.carer.monthsSinceOrderMade;
    const shouldHaveBeenPaidWeekly =
      base.carer.wasFosterCarerForThisChild && monthsAtStart < 24 && prev !== undefined && prev > maximumWeekly
        ? prev
        : maximumWeekly;

    const segmentShortfall = mul(
      clampMin0(sub(shouldHaveBeenPaidWeekly, actuallyPaidWeekly)),
      weeks,
    );

    segments.push({
      from: start.date,
      to: displayTo,
      weeks: Math.round(weeks * 100) / 100,
      financialYear: table.financialYear,
      ageBand: band.id,
      maximumWeekly,
      shouldHaveBeenPaidWeekly,
      actuallyPaidWeekly,
      segmentShortfall,
      reason: start.reason,
    });
  }

  const totalShouldHaveBeenPaid = add(
    ...segments.map((s) => mul(s.shouldHaveBeenPaidWeekly, s.weeks)),
  );
  const totalActuallyPaid = add(...segments.map((s) => mul(s.actuallyPaidWeekly, s.weeks)));
  const shortfall = add(...segments.map((s) => s.segmentShortfall));

  const caveats = [...BACKDATING_CAVEATS];
  if (blockedYears.size > 0) {
    caveats.unshift(
      `We have left out ${[...blockedYears].sort().join(', ')} because we do not yet hold verified rates for ` +
        `${blockedYears.size === 1 ? 'that year' : 'those years'}. The total below covers only the years we can evidence.`,
    );
  }

  return {
    segments,
    totalShouldHaveBeenPaid,
    totalActuallyPaid,
    shortfall,
    yearsCovered: [...yearsCovered].sort(),
    blockedYears: [...blockedYears].sort(),
    caveats,
  };
}

export { nthBirthday, pence };
