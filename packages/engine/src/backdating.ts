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
import { add, clampMin0, formatMoney, mul, pence, sub, type Pence } from './money.js';
import { defaultDeps, lookupRate, resolveAgeBand, type EngineDeps } from './engine.js';
import type { CalculatorInput, IsoDate, Nation, RateTable } from './types.js';

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
  | 'reg7-anniversary'
  | 'april-tax-year-boundary';

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
  /**
   * Only on the 1 to 5 April segments. DfE states the allowance on a tax year
   * beginning 6 April; councils uplift from 1 April. Both are right in their
   * own frame, so this segment carries the figure the other convention gives
   * and the site says which it used. See OPEN-ITEMS.md, the April boundary.
   */
  taxYearAlternativeWeekly?: Pence;
}

export interface BackdatingResult {
  segments: BackdatingSegment[];
  totalShouldHaveBeenPaid: Pence;
  totalActuallyPaid: Pence;
  shortfall: Pence;
  yearsCovered: string[];
  /** Financial years with PENDING_SOURCE rate data. Never estimated. */
  blockedYears: string[];
  /**
   * How much of the shortfall rests on using the council convention rather than
   * the DfE tax year, across every April in the period. Zero for a council that
   * uplifts on 1 April, which is most of them. Never large, and never silent.
   */
  aprilBoundaryDifference: Pence;
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
    // The five days a council and the DfE disagree about. Cutting here keeps
    // 1 to 5 April in a segment of its own, so the part of the total that
    // depends on which convention the council follows can be stated rather
    // than buried inside a longer segment.
    const taxYearStart = `${b.slice(0, 4)}-04-06` as IsoDate;
    if (taxYearStart > fromDate && taxYearStart <= toDate && !points.has(taxYearStart)) {
      points.set(taxYearStart, 'april-tax-year-boundary');
    }
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

function rateTableFor(
  tables: RateTable[],
  asAt: IsoDate,
  nation: Nation,
): RateTable | { blocked: string } {
  const match = tables.find((t) => asAt >= t.effectiveFrom && asAt <= t.effectiveTo);
  if (!match) return { blocked: financialYearOf(asAt) };
  if (match.status === 'PENDING_SOURCE') return { blocked: match.financialYear };
  // A year can be sourced for one nation and not another — the archived GOV.UK
  // table for 2024/25 says in terms that it applies to England. Block the year
  // for the others, so an English carer still gets their figure and a Welsh one
  // gets an honest gap instead of a thrown error.
  if (!match[nation]) return { blocked: match.financialYear };
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
  let aprilBoundaryDifference = pence(0);

  /** True for 1 to 5 April, the days the two conventions disagree about. */
  const inAprilWindow = (date: IsoDate): boolean => {
    const md = date.slice(5);
    return md >= '04-01' && md <= '04-05';
  };

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

    const table = rateTableFor(deps.rateTables, start.date, base.carer.nation);
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

    const segment: BackdatingSegment = {
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
    };

    // On 1 to 5 April the council convention (this table) and the DfE tax year
    // (the previous one) give different rates. We pay out on the council
    // convention, because that is what decides what a carer was actually paid,
    // and record what the other reading would have given so the difference is
    // visible instead of assumed away. If the previous year is not sourced,
    // there is nothing to compare against and nothing is claimed.
    if (inAprilWindow(start.date)) {
      const previous = rateTableFor(deps.rateTables, addDays(start.date, -7), base.carer.nation);
      if (!('blocked' in previous)) {
        const previousBand = resolveAgeBand(
          previous,
          base.carer.nation,
          { ...child, ageYears: ageAtStart, dateOfBirth: undefined },
          start.date,
        );
        const alternativeWeekly = lookupRate(previous, base.carer, previousBand, deps);
        segment.taxYearAlternativeWeekly = alternativeWeekly;
        aprilBoundaryDifference = add(
          aprilBoundaryDifference,
          mul(clampMin0(sub(maximumWeekly, alternativeWeekly)), weeks),
        );
      }
    }

    segments.push(segment);
  }

  const totalShouldHaveBeenPaid = add(
    ...segments.map((s) => mul(s.shouldHaveBeenPaidWeekly, s.weeks)),
  );
  const totalActuallyPaid = add(...segments.map((s) => mul(s.actuallyPaidWeekly, s.weeks)));
  const shortfall = add(...segments.map((s) => s.segmentShortfall));

  const caveats = [...BACKDATING_CAVEATS];
  if (aprilBoundaryDifference > 0) {
    caveats.unshift(
      `Councils normally raise their rates on 1 April and we have used that date. The Department for ` +
        `Education states the same rates on a tax year beginning 6 April. If your council follows the tax ` +
        `year instead, ${formatMoney(aprilBoundaryDifference)} of the figure below would not apply.`,
    );
  }
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
    aprilBoundaryDifference,
    caveats,
  };
}

export { nthBirthday, pence };
