/** Dates and financial years — spec §11. */

import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  ageAt,
  ageBandChangeDates,
  daysBetween,
  financialYearBoundaries,
  financialYearOf,
  isoDate,
  monthsBetween,
  nthBirthday,
  selectBenefitTable,
  selectRateTable,
  todayUtc,
} from '../dates.js';
import { DataError } from '../errors.js';
import { BENEFIT_TABLES, RATE_TABLES } from '../referenceData.js';
import { d } from './fixtures.js';

describe('dates', () => {
  it('validates ISO dates', () => {
    expect(isoDate('2026-04-01')).toBe('2026-04-01');
    expect(() => isoDate('01/04/2026')).toThrow(DataError);
    expect(() => isoDate('2026-02-30')).toThrow(DataError);
  });

  it('uses UTC so BST cannot shift the financial year', () => {
    // 00:30 BST on 1 April 2026 is 23:30 UTC on 31 March — the UTC date is what
    // the rate lookup must use, consistently, everywhere.
    const bstMidnightish = new Date('2026-03-31T23:30:00Z');
    expect(todayUtc(bstMidnightish)).toBe('2026-03-31');
    expect(todayUtc(new Date('2026-04-01T00:30:00Z'))).toBe('2026-04-01');
  });

  it('computes age at a date, not age today', () => {
    expect(ageAt(d('2014-06-15'), d('2026-06-14'))).toBe(11);
    expect(ageAt(d('2014-06-15'), d('2026-06-15'))).toBe(12);
    expect(ageAt(d('2014-06-15'), d('2026-08-01'))).toBe(12);
  });

  it('adds months and days, clamping short months', () => {
    expect(addMonths(d('2026-01-31'), 1)).toBe('2026-02-28');
    expect(addMonths(d('2026-05-15'), 24)).toBe('2028-05-15');
    expect(addDays(d('2026-04-01'), -1)).toBe('2026-03-31');
    expect(daysBetween(d('2026-04-01'), d('2026-04-08'))).toBe(7);
    expect(monthsBetween(d('2025-05-01'), d('2026-08-01'))).toBe(15);
    expect(monthsBetween(d('2025-05-15'), d('2026-05-14'))).toBe(11);
  });

  it('labels and bounds financial years from 1 April', () => {
    expect(financialYearOf(d('2026-03-31'))).toBe('2025-26');
    expect(financialYearOf(d('2026-04-01'))).toBe('2026-27');
    expect(financialYearBoundaries(d('2025-05-01'), d('2027-06-01'))).toEqual([
      '2026-04-01',
      '2027-04-01',
    ]);
  });

  it('finds age-band birthdays within a period', () => {
    const bands = [
      { minAge: 0, maxAge: 2 },
      { minAge: 3, maxAge: 4 },
      { minAge: 5, maxAge: 10 },
      { minAge: 11, maxAge: 15 },
      { minAge: 16, maxAge: 17 },
    ];
    expect(ageBandChangeDates(d('2015-06-15'), d('2025-05-01'), d('2027-01-01'), bands)).toEqual([
      '2026-06-15',
    ]);
    // 29 February births roll to 1 March in a common year.
    expect(nthBirthday(d('2016-02-29'), 9)).toBe('2025-03-01');
    expect(nthBirthday(d('2016-02-29'), 8)).toBe('2024-02-29');
  });

  it('selects rate and benefit tables independently (§11)', () => {
    expect(selectRateTable(RATE_TABLES, d('2026-04-01')).financialYear).toBe('2026-27');
    expect(selectBenefitTable(BENEFIT_TABLES, d('2026-04-05')).financialYear).toBe('2025-26');
    expect(() => selectBenefitTable(BENEFIT_TABLES, d('2020-01-01'))).toThrow(DataError);
  });
});
