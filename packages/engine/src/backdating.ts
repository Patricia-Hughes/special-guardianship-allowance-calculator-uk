/**
 * Backdating module, spec §16.
 *
 * High value: the Ombudsman has ordered councils to backdate, so "what should I
 * have been paid since the order?" is a real question with real money attached.
 *
 * The work is all in the segmenting. The rate changes on every 1 April, on
 * every birthday that crosses an age band, and when the reg 7 window closes, so
 * the period is cut at each of those and each piece is priced on its own.
 *
 * [HARD] If a segment falls in a financial year whose rate data is
 * PENDING_SOURCE, it is not estimated. The year goes in `blockedYears` and the
 * carer sees a partial total with an explicit note. A backdating figure built
 * on a guessed historic rate is worse than no figure: the carer takes it to a
 * complaint and it gets shot down.
 */

import {
  addDays,
  addMonths,
  ageAt,
  ageBandChangeDates,
  daysBetween,
  financialYearBoundaries,
  financialYearOf,
  monthsBetween,
  nthBirthday,
} from './dates.js';
import { defaultDeps, type EngineDeps } from './deps.js';
import { DataError } from './errors.js';
import { add, clampMin0, formatMoney, mul, pence, sub, type Pence } from './money.js';
import { lookupRate, resolveAgeBand } from './rates.js';
import { REG7_WINDOW_MONTHS } from './resolve.js';
import type { AgeBand, CalculatorInput, ChildInput, IsoDate, Nation, RateTable } from './types.js';

const DAYS_PER_WEEK = 7;

// ─── Shape ─────────────────────────────────────────────────────────────────

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
  "This shows the difference against your council's lawful maximum, not a guaranteed entitlement.",
  'A council can lawfully pay less after properly assessing your circumstances.',
  'The Ombudsman normally expects complaints within 12 months of you becoming aware, though there is discretion.',
  'Backdating has been ordered in real cases (Devon 2024; North Tyneside 17 002 928).',
];

// ─── Where to cut ──────────────────────────────────────────────────────────

/**
 * Split the period at every point where the rate could change (§16):
 *   1. each 1 April, the financial year boundary
 *   2. each 6 April, where the DfE's tax year disagrees with it
 *   3. each birthday that crosses an age band boundary
 *   4. the 24-month reg 7 anniversary
 *   5. the start of the requested period
 */
export function segmentBoundaries(
  input: BackdatingInput,
  bands: ReadonlyArray<{ minAge: number; maxAge: number }>,
): Array<{ date: IsoDate; reason: SegmentReason }> {
  const { fromDate, toDate, base } = input;
  const points = new Map<string, SegmentReason>();

  // First writer wins throughout, so a date that is both a year boundary and a
  // birthday keeps the reason listed first here.
  const cut = (date: IsoDate, reason: SegmentReason): void => {
    if (date > fromDate && date <= toDate && !points.has(date)) points.set(date, reason);
  };

  points.set(fromDate, 'period-start');

  // Only England has a tax-year framing to disagree with. The Welsh circular
  // says "from 1 April", the Northern Irish model scheme says "From 1st April",
  // and the Scottish rates were backdated to 1 April. Cutting those three at
  // 6 April produces five-day segments with the same rate on both sides: noise
  // in the segment list and nothing in the arithmetic.
  const hasTaxYearFraming = base.carer.nation === 'england';

  for (const boundary of financialYearBoundaries(fromDate, toDate)) {
    if (!points.has(boundary)) points.set(boundary, 'financial-year-change');
    // The five days a council and the DfE disagree about. Cutting here keeps
    // 1 to 5 April in a segment of its own, so the part of the total that
    // depends on which convention the council follows can be stated rather
    // than buried inside a longer segment.
    if (hasTaxYearFraming) {
      cut(`${boundary.slice(0, 4)}-04-06` as IsoDate, 'april-tax-year-boundary');
    }
  }

  for (const child of base.children) {
    if (!child.dateOfBirth) continue;
    for (const date of ageBandChangeDates(child.dateOfBirth, fromDate, toDate, bands)) {
      cut(date, 'age-band-change');
    }
  }

  if (base.carer.wasFosterCarerForThisChild && base.carer.orderDate) {
    cut(addMonths(base.carer.orderDate, REG7_WINDOW_MONTHS), 'reg7-anniversary');
  }

  return [...points.entries()]
    .map(([date, reason]) => ({ date: date as IsoDate, reason }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Finding a rate for a date ─────────────────────────────────────────────

type TableOrBlocked = RateTable | { blocked: string };

function rateTableFor(tables: RateTable[], asAt: IsoDate, nation: Nation): TableOrBlocked {
  const match = tables.find((t) => asAt >= t.effectiveFrom && asAt <= t.effectiveTo);
  if (!match) return { blocked: financialYearOf(asAt) };
  if (match.status === 'PENDING_SOURCE') return { blocked: match.financialYear };
  // A year can be sourced for one nation and not another: the archived GOV.UK
  // table for 2024/25 says in terms that it applies to England. Block the year
  // for the others, so an English carer still gets their figure and a Welsh one
  // gets an honest gap instead of a thrown error.
  if (!match[nation]) return { blocked: match.financialYear };
  return match;
}

/**
 * The band for a child at a moment.
 *
 * Segmentation guarantees the band does not change inside a segment, so the age
 * at the start is the age throughout. The date of birth is dropped because the
 * age has already been resolved and passing both would resolve it twice.
 */
function bandAt(
  table: RateTable,
  nation: Nation,
  child: ChildInput,
  ageYears: number,
  at: IsoDate,
): AgeBand {
  return resolveAgeBand(table, nation, { ...child, ageYears, dateOfBirth: undefined }, at);
}

// ─── The calculation ───────────────────────────────────────────────────────

export function calculateBackdating(
  input: BackdatingInput,
  depsOverride?: Partial<EngineDeps>,
): BackdatingResult {
  const deps: EngineDeps = { ...defaultDeps(), ...depsOverride };
  const { base, fromDate, toDate, actuallyPaidWeekly } = input;
  const nation = base.carer.nation;

  if (toDate < fromDate) {
    throw new DataError('The end of the backdating period is before its start.');
  }
  if (base.children.length !== 1) {
    // Apportioning a household contribution across a period, per child, with
    // age-band changes at different dates, is not specified. Refuse rather than
    // invent an allocation.
    throw new DataError('Backdating currently supports one child at a time.');
  }
  const child = base.children[0];
  /* c8 ignore next */
  if (!child) throw new DataError('Backdating needs a child.');

  const boundaries = segmentBoundaries(input, ageBandsFor(deps, nation));

  const segments: BackdatingSegment[] = [];
  const blockedYears = new Set<string>();
  const yearsCovered = new Set<string>();
  let aprilBoundaryDifference = pence(0);

  for (const [i, start] of boundaries.entries()) {
    // Segments are half-open: [start, nextStart). The displayed `to` is the day
    // before the next segment begins, so the period reads naturally.
    const next = boundaries[i + 1];
    const endExclusive = next ? next.date : addDays(toDate, 1);
    const displayTo = addDays(endExclusive, -1);
    if (displayTo < start.date) continue;

    const table = rateTableFor(deps.rateTables, start.date, nation);
    if ('blocked' in table) {
      blockedYears.add(table.blocked);
      continue;
    }
    yearsCovered.add(table.financialYear);

    const weeks = daysBetween(start.date, endExclusive) / DAYS_PER_WEEK;
    const age = child.dateOfBirth ? ageAt(child.dateOfBirth, start.date) : child.ageYears;
    const band = bandAt(table, nation, child, age, start.date);
    const maximumWeekly = lookupRate(table, base.carer, band, deps);
    const shouldHaveBeenPaidWeekly = applyReg7Floor(base, start.date, maximumWeekly);

    const segment: BackdatingSegment = {
      from: start.date,
      to: displayTo,
      weeks: Math.round(weeks * 100) / 100,
      financialYear: table.financialYear,
      ageBand: band.id,
      maximumWeekly,
      shouldHaveBeenPaidWeekly,
      actuallyPaidWeekly,
      segmentShortfall: mul(clampMin0(sub(shouldHaveBeenPaidWeekly, actuallyPaidWeekly)), weeks),
      reason: start.reason,
    };

    const alternative = taxYearAlternative(deps, base, child, age, start.date, maximumWeekly);
    if (alternative) {
      segment.taxYearAlternativeWeekly = alternative.weekly;
      aprilBoundaryDifference = add(aprilBoundaryDifference, mul(alternative.difference, weeks));
    }

    segments.push(segment);
  }

  return {
    segments,
    totalShouldHaveBeenPaid: add(...segments.map((s) => mul(s.shouldHaveBeenPaidWeekly, s.weeks))),
    totalActuallyPaid: add(...segments.map((s) => mul(s.actuallyPaidWeekly, s.weeks))),
    shortfall: add(...segments.map((s) => s.segmentShortfall)),
    yearsCovered: [...yearsCovered].sort(),
    blockedYears: [...blockedYears].sort(),
    aprilBoundaryDifference,
    caveats: caveatsFor(blockedYears, aprilBoundaryDifference),
  };
}

/**
 * Age bands come from the CURRENT table. They have been stable across the
 * sourced years, and a change would be caught by the data validation gate.
 */
function ageBandsFor(deps: EngineDeps, nation: Nation): AgeBand[] {
  const current = deps.rateTables.find((t) => t.status !== 'PENDING_SOURCE');
  /* c8 ignore next */
  if (!current) throw new DataError('No sourced rate table available.');
  const section = nation === 'england' ? current.england : current[nation];
  if (!section) throw new DataError(`No ${nation} rates available for backdating.`);
  return section.ageBands;
}

/**
 * [R4] Within the reg 7 window a former foster carer's previous allowance is
 * the floor, so a segment inside the window is priced at whichever is higher.
 *
 * The previous allowance is a HOUSEHOLD figure: the carer is asked once what
 * they were paid, for everyone they were fostering. Comparing it against one
 * child's maximum is only correct here because calculateBackdating refuses more
 * than one child, so the household and the child are the same thing. Lift that
 * restriction and this becomes the bug sgo.ts had, where a carer with two
 * children was shown twice what they used to be paid: floor the summed total
 * and share it back, the way applyReg7Floor in regimes/sgo.ts does.
 */
function applyReg7Floor(base: CalculatorInput, at: IsoDate, maximumWeekly: Pence): Pence {
  const previous = base.carer.previousWeeklyFosteringAllowance;
  if (!base.carer.wasFosterCarerForThisChild || previous === undefined) return maximumWeekly;

  const months = base.carer.orderDate
    ? monthsBetween(base.carer.orderDate, at)
    : base.carer.monthsSinceOrderMade;
  // Unknown is not inside the window. See withinReg7Window in resolve.ts.
  if (months === undefined) return maximumWeekly;
  return months < REG7_WINDOW_MONTHS && previous > maximumWeekly ? previous : maximumWeekly;
}

/** 1 to 5 April: the days the council convention and the DfE tax year disagree. */
function inAprilWindow(date: IsoDate): boolean {
  const monthDay = date.slice(5);
  return monthDay >= '04-01' && monthDay <= '04-05';
}

/**
 * What the DfE tax year reading would have paid for this segment.
 *
 * The payout follows the council convention, because that is what decides what
 * a carer was actually paid. This records the other reading so the difference
 * is visible instead of assumed away. If the previous year is not sourced there
 * is nothing to compare against, and nothing is claimed.
 */
function taxYearAlternative(
  deps: EngineDeps,
  base: CalculatorInput,
  child: ChildInput,
  age: number,
  at: IsoDate,
  maximumWeekly: Pence,
): { weekly: Pence; difference: Pence } | null {
  // England only, for the same reason the 6 April cut is: nowhere else has a
  // second convention for the alternative to be an alternative TO.
  if (base.carer.nation !== 'england' || !inAprilWindow(at)) return null;

  const previous = rateTableFor(deps.rateTables, addDays(at, -7), base.carer.nation);
  if ('blocked' in previous) return null;

  const band = bandAt(previous, base.carer.nation, child, age, at);
  const weekly = lookupRate(previous, base.carer, band, deps);
  return { weekly, difference: clampMin0(sub(maximumWeekly, weekly)) };
}

function caveatsFor(blockedYears: Set<string>, aprilBoundaryDifference: Pence): string[] {
  const caveats = [...BACKDATING_CAVEATS];

  if (aprilBoundaryDifference > 0) {
    caveats.unshift(
      `Councils normally raise their rates on 1 April and I have used that date. The Department for ` +
        `Education states the same rates on a tax year beginning 6 April. If your council follows the tax ` +
        `year instead, ${formatMoney(aprilBoundaryDifference)} of the figure below would not apply.`,
    );
  }
  if (blockedYears.size > 0) {
    caveats.unshift(
      `I have left out ${[...blockedYears].sort().join(', ')} because I do not yet hold verified rates for ` +
        `${blockedYears.size === 1 ? 'that year' : 'those years'}. The total below covers only the years I can evidence.`,
    );
  }
  return caveats;
}

export { nthBirthday, pence };
