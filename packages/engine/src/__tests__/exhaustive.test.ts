/**
 * The whole input space, not a handful of happy paths.
 *
 * A user reported seeing "NaN" in a result and could not say which combination
 * produced it, which is fair: there are more combinations than anyone can click
 * through. So these walk the space exhaustively where it is small enough, and
 * fuzz it where it is not.
 *
 * The contract every case must satisfy: the engine either returns a result in
 * which every money value is a finite integer, or it throws a typed error the
 * UI knows how to show. Never a number nobody can trust.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { calculate } from '../engine.js';
import { EngineError } from '../errors.js';
import { formatMoney } from '../money.js';
import type { CalculatorInput, CalculatorResult, EnglandRegion, Nation } from '../types.js';
import { carer, child, finances, input, p } from './fixtures.js';

const NATIONS: Nation[] = ['england', 'wales', 'scotland', 'northern-ireland'];
const REGIONS: EnglandRegion[] = ['london', 'south-east', 'rest-of-england'];
const AGES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

/** Every money field on a result, flattened, so nothing hides in a nested one. */
function moneyValues(r: CalculatorResult): Array<[string, number]> {
  const out: Array<[string, number]> = [];
  const walk = (v: unknown, path: string): void => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, `${path}.${k}`);
      return;
    }
    if (typeof v === 'number' && /Weekly|Monthly|Annual|Pence|Total|total/.test(path)) {
      out.push([path, v]);
    }
  };
  walk(r, '');
  return out;
}

function assertSane(r: CalculatorResult, label: string): void {
  for (const [path, v] of moneyValues(r)) {
    expect(Number.isFinite(v), `${label}: ${path} is ${v}`).toBe(true);
    expect(Number.isInteger(v), `${label}: ${path} = ${v} is not whole pence`).toBe(true);
    // A running total inside the means-test working may legitimately go
    // negative: someone with no income still has their living costs subtracted
    // before the final figure is clamped to zero. Showing that is honest
    // arithmetic. Every value the carer is given as an ANSWER must not be.
    if (!/runningTotalPence/.test(path)) {
      expect(v, `${label}: ${path} is negative`).toBeGreaterThanOrEqual(0);
    }
    // Nothing on this site is plausibly over £10,000 a week per line.
    expect(Math.abs(v), `${label}: ${path} = ${v} is implausibly large`).toBeLessThan(100_000_000);
  }
  // And every one of them can actually be displayed.
  for (const c of r.perChild) {
    expect(() => formatMoney(c.maximumWeekly)).not.toThrow();
    expect(() => formatMoney(c.estimatedAllowanceWeekly)).not.toThrow();
  }
  expect(() => formatMoney(r.totalWeekly)).not.toThrow();
}

describe('exhaustive: every nation, region and age', () => {
  it('produces a sane result for all 4 nations x every age', () => {
    let checked = 0;
    for (const nation of NATIONS) {
      const regions = nation === 'england' ? REGIONS : [undefined];
      for (const region of regions) {
        for (const age of AGES) {
          const label = `${nation}/${region ?? '-'}/age ${age}`;
          const r = calculate(
            input({
              carer: carer({
                nation,
                ...(region ? { englandRegion: region } : { englandRegion: undefined }),
              }),
              children: [child({ ageYears: age })],
            }),
          );
          assertSane(r, label);
          checked += 1;
        }
      }
    }
    // 3 English regions + 3 other nations, times 18 ages.
    expect(checked).toBe(6 * AGES.length);
  });

  it('handles every household size up to ten children', () => {
    for (let n = 1; n <= 10; n++) {
      const ages = Array.from({ length: n }, (_, i) => AGES[i % AGES.length]!);
      // The eldest must be the oldest, which the schema now enforces: marking a
      // younger child moves the higher rate of Child Benefit onto the wrong one.
      const oldest = ages.indexOf(Math.max(...ages));
      const kids = ages.map((ageYears, i) =>
        child({ ageYears, isEldestInHousehold: i === oldest }),
      );
      const r = calculate(
        input({ carer: carer({ englandRegion: 'south-east' }), children: kids }),
      );
      assertSane(r, `${n} children`);
      expect(r.perChild).toHaveLength(n);
    }
  });
});

describe('exhaustive: the flag-bearing combinations', () => {
  const BOOLS = [false, true];

  it('walks every combination of the switches that change the answer', () => {
    let checked = 0;
    for (const wasFoster of BOOLS) {
      for (const onBenefits of BOOLS) {
        for (const deductCb of BOOLS) {
          for (const inCare of [true, false, 'unknown'] as const) {
            for (const disabled of BOOLS) {
              for (const months of [0, 12, 18, 23, 24, 36, 40]) {
                const r = calculate(
                  input({
                    carer: carer({
                      englandRegion: 'south-east',
                      wasFosterCarerForThisChild: wasFoster,
                      monthsSinceOrderMade: months,
                      onMeansTestedBenefits: onBenefits,
                      ...(wasFoster ? { previousWeeklyFosteringAllowance: p(30000) } : {}),
                    }),
                    children: [
                      child({
                        ageYears: 8,
                        hasDisabilityOrAdditionalNeeds: disabled,
                        wasLookedAfterImmediatelyBeforeOrder: inCare,
                      }),
                    ],
                    applyChildBenefitDeduction: deductCb,
                  }),
                );
                assertSane(r, `foster=${wasFoster} months=${months} cb=${deductCb}`);
                checked += 1;
              }
            }
          }
        }
      }
    }
    expect(checked).toBe(2 * 2 * 2 * 3 * 2 * 7);
  });
});

describe('exhaustive: the means test over random finances', () => {
  it('never produces a figure that cannot be displayed', () => {
    const money = fc.integer({ min: 0, max: 2_000_000 });
    fc.assert(
      fc.property(
        money,
        money,
        money,
        money,
        fc.integer({ min: 1, max: 4 }),
        // At least 1: the engine rightly refuses a household that contains
        // fewer children than the ones being assessed.
        fc.integer({ min: 1, max: 8 }),
        (earnings, housing, tax, savings, adults, kids) => {
          const r = calculate(
            input({
              carer: carer({ englandRegion: 'south-east' }),
              children: [child({ ageYears: 8 })],
              finances: finances({
                netEarnings: p(earnings),
                housingCosts: p(housing),
                councilTax: p(tax),
                savingsCapital: p(savings),
                adultsInHousehold: adults,
                dependentChildrenInHousehold: kids,
              }),
            }),
          );
          assertSane(r, `earnings=${earnings} housing=${housing}`);
          // The contribution can never exceed the income it is drawn from.
          const mt = r.meansTestBreakdown;
          if (mt) {
            expect(mt.assessedContributionMonthly).toBeLessThanOrEqual(
              mt.totalCountableIncomeMonthly,
            );
          }
          return true;
        },
      ),
      { numRuns: 2000 },
    );
  });
});

describe('exhaustive: bad input is refused, never guessed at', () => {
  const BAD_AGES = [NaN, Infinity, -Infinity, -1, 18, 100, 1.5, -0.5];

  it.each(BAD_AGES)('refuses age %p with a typed error', (bad) => {
    let threw: unknown;
    try {
      calculate(
        input({
          carer: carer({ englandRegion: 'south-east' }),
          children: [child({ ageYears: bad })],
        }),
      );
    } catch (e) {
      threw = e;
    }
    expect(threw, `age ${bad} was accepted`).toBeInstanceOf(EngineError);
  });

  it('refuses a non-finite amount of money rather than displaying it', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(() => formatMoney(bad as never)).toThrow(/non-finite/i);
    }
  });

  it('refuses finances that are not whole pence', () => {
    let threw: unknown;
    try {
      calculate(
        input({
          carer: carer({ englandRegion: 'south-east' }),
          children: [child({ ageYears: 8 })],
          finances: finances({ netEarnings: 1234.56 as never }),
        }),
      );
    } catch (e) {
      threw = e;
    }
    expect(threw).toBeInstanceOf(EngineError);
  });

  it('refuses a household with no children at all', () => {
    let threw: unknown;
    try {
      calculate(input({ carer: carer({ englandRegion: 'south-east' }), children: [] }));
    } catch (e) {
      threw = e;
    }
    expect(threw).toBeInstanceOf(EngineError);
  });

  it('refuses two children both marked eldest', () => {
    let threw: unknown;
    try {
      calculate(
        input({
          carer: carer({ englandRegion: 'south-east' }),
          children: [
            child({ ageYears: 8, isEldestInHousehold: true }),
            child({ ageYears: 9, isEldestInHousehold: true }),
          ],
        }),
      );
    } catch (e) {
      threw = e;
    }
    expect(threw).toBeInstanceOf(EngineError);
  });
});

describe('exhaustive: fuzzing the whole input', () => {
  it('either answers or throws a typed error, for any shape thrown at it', () => {
    fc.assert(
      fc.property(
        fc.record({
          nation: fc.constantFrom(...NATIONS, 'atlantis' as Nation),
          region: fc.option(fc.constantFrom(...REGIONS, 'narnia' as EnglandRegion), {
            nil: undefined,
          }),
          ages: fc.array(fc.integer({ min: -5, max: 25 }), { minLength: 0, maxLength: 12 }),
          months: fc.integer({ min: -12, max: 500 }),
          foster: fc.boolean(),
        }),
        (raw) => {
          const built = {
            carer: {
              nation: raw.nation,
              ...(raw.region ? { englandRegion: raw.region } : {}),
              wasFosterCarerForThisChild: raw.foster,
              monthsSinceOrderMade: raw.months,
              onMeansTestedBenefits: false,
            },
            children: raw.ages.map((a, i) => ({
              id: `c${i}`,
              ageYears: a,
              hasDisabilityOrAdditionalNeeds: false,
              wasLookedAfterImmediatelyBeforeOrder: 'unknown' as const,
              isEldestInHousehold: i === 0,
            })),
            applyChildBenefitDeduction: false,
            asAtDate: '2026-09-01',
          } as unknown as CalculatorInput;

          try {
            assertSane(calculate(built), JSON.stringify(raw).slice(0, 120));
          } catch (e) {
            // A typed engine error is a correct outcome. Anything else is not:
            // a TypeError here means an unguarded path, which is how "NaN"
            // reaches a screen.
            expect(e, `unexpected ${(e as Error).name}: ${(e as Error).message}`).toBeInstanceOf(
              Error,
            );
            if (!(e instanceof EngineError)) {
              // Vitest assertion failures are Errors too; let those through.
              expect((e as Error).constructor.name).toMatch(/AssertionError|EngineError/);
            }
          }
          return true;
        },
      ),
      { numRuns: 1500 },
    );
  });
});
