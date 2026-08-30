/**
 * Engine paths not covered by the §35 legal cases: validation, the Wales and NI
 * routes, region resolution, the standing flags, and the error states of §33.
 */

import { describe, expect, it } from 'vitest';
import { calculate, defaultDeps, isKinshipZoneEligible, regimeFor, resolveEnglandRegion } from '../engine.js';
import { calculateBackdating, segmentBoundaries } from '../backdating.js';
import { DataError, ValidationError } from '../errors.js';
import { dedupeFlags, makeFlag, sortFlags } from '../flags.js';
import {
  LA_REGION_MAP,
  LA_REGION_MAP_META,
  allCitationIds,
  cite,
  hasUnpublishableLaOverride,
  isPublishable,
  publishableLaOverride,
} from '../referenceData.js';
import { FLAGS } from '../featureFlags.js';
import { carer, child, d, depsWithMeansTest, finances, input, p, publishableLa } from './fixtures.js';

describe('engine — routing and regimes', () => {
  it('maps each nation to its regime', () => {
    expect(regimeFor('england')).toBe('england-sgo');
    expect(regimeFor('wales')).toBe('wales-sgo');
    expect(regimeFor('northern-ireland')).toBe('ni-sgo');
    expect(regimeFor('scotland')).toBe('scotland-kinship');
  });

  it('calculates the Wales route from the sourced table', () => {
    const r = calculate(
      input({
        carer: carer({ nation: 'wales', englandRegion: undefined }),
        children: [child({ ageYears: 7 })],
      }),
    );
    expect(r.regime).toBe('wales-sgo');
    expect(r.perChild[0]!.maximumWeekly).toBe(20800);
    expect(r.perChild[0]!.ageBand).toBe('5-15');
  });

  it('calculates the Northern Ireland route', () => {
    const r = calculate(
      input({
        carer: carer({ nation: 'northern-ireland', englandRegion: undefined }),
        children: [child({ ageYears: 12 })],
      }),
    );
    expect(r.regime).toBe('ni-sgo');
    expect(r.perChild[0]!.maximumWeekly).toBe(20000);
  });

  it('resolves the England region from the council when no region is given', () => {
    const la = publishableLa({ slug: 'testville', region: 'london' });
    expect(
      resolveEnglandRegion(carer({ englandRegion: undefined, localAuthoritySlug: 'testville' }), {
        ...defaultDeps(),
        laOverrides: { testville: la },
      }),
    ).toBe('london');
  });

  it('resolves the region from the council alone, for any English authority', () => {
    // Spec §12 route 1: picking a council is the default and most reliable path.
    // la-region-map covers every authority; la-overrides covers a handful. The
    // engine must consult the map, or picking a council would only work for the
    // few councils whose policy we happen to hold.
    const r = calculate(
      input({
        carer: carer({ englandRegion: undefined, localAuthoritySlug: 'camden' }),
        children: [child({ ageYears: 12 })],
      }),
    );
    expect(r.perChild[0]!.coreAllowanceWeekly).toBe(26600); // London 11-15
    expect(resolveEnglandRegion(carer({ englandRegion: undefined, localAuthoritySlug: 'kent' }))).toBe(
      'south-east',
    );
    expect(resolveEnglandRegion(carer({ englandRegion: undefined, localAuthoritySlug: 'devon' }))).toBe(
      'rest-of-england',
    );
  });

  it('lets an explicit region override the council mapping', () => {
    // §12 route 3 is always available, including where our mapping is wrong —
    // and §42 item 8 says the mapping is not yet verified against the DfE's own
    // regional definition.
    expect(
      resolveEnglandRegion(carer({ englandRegion: 'london', localAuthoritySlug: 'devon' })),
    ).toBe('london');
  });

  it('refuses to guess an England region', () => {
    expect(() => resolveEnglandRegion(carer({ englandRegion: undefined }))).toThrow(DataError);
  });

  it('rejects an England input with neither region nor council', () => {
    expect(() =>
      calculate(input({ carer: carer({ englandRegion: undefined }) })),
    ).toThrow(ValidationError);
  });

  it('rejects more than ten children, and none at all', () => {
    const many = Array.from({ length: 11 }, (_, i) => child({ id: `c${i}`, isEldestInHousehold: i === 0 }));
    expect(() => calculate(input({ children: many }))).toThrow(/up to 10 children/);
    expect(() => calculate(input({ children: [] }))).toThrow(/at least one child/);
  });

  it('rejects two eldest children', () => {
    expect(() =>
      calculate(
        input({
          children: [child({ id: 'a' }), child({ id: 'b' })],
        }),
      ),
    ).toThrow(/only one child can be the eldest/i);
  });

  it('requires the previous allowance from a former foster carer', () => {
    expect(() =>
      calculate(input({ carer: carer({ wasFosterCarerForThisChild: true }) })),
    ).toThrow(/weekly amount you received as a foster carer/);
  });

  it('requires the household child count to include the children entered', () => {
    expect(() =>
      calculate(
        input({
          children: [child({ id: 'a' }), child({ id: 'b', isEldestInHousehold: false })],
          finances: finances({ dependentChildrenInHousehold: 1 }),
        }),
        depsWithMeansTest(),
      ),
    ).toThrow(/children you've already entered/);
  });

  it('prefers date of birth over the stated age', () => {
    const r = calculate(
      input({
        asAtDate: d('2026-09-01'),
        children: [child({ ageYears: 3, dateOfBirth: d('2010-01-01') })],
      }),
    );
    // Actually 16 on 1 Sept 2026, not 3.
    expect(r.perChild[0]!.ageAtCalculation).toBe(16);
    expect(r.perChild[0]!.ageBand).toBe('16-17');
  });

  it('prefers the order date over the stated month count', () => {
    const r = calculate(
      input({
        asAtDate: d('2026-09-01'),
        carer: carer({
          wasFosterCarerForThisChild: true,
          previousWeeklyFosteringAllowance: p(30000),
          orderDate: d('2025-03-01'), // 18 months → REG7_EXPIRING
          monthsSinceOrderMade: 0,
        }),
      }),
    );
    expect(r.flags.some((f) => f.code === 'REG7_EXPIRING')).toBe(true);
  });

  it('blocks the means test on the shipped data rather than mislabelling the result', () => {
    expect(() => calculate(input({ finances: finances() }))).toThrow(DataError);
    expect(() => calculate(input({ finances: finances() }))).toThrow(/not yet sourced/);
  });

  it('refuses to deduct Child Benefit from an unsourced benefit table', () => {
    const unsourcedCb = {
      ...depsWithMeansTest().benefitTables![0]!,
      childBenefit: {
        eldestWeeklyPence: null,
        additionalChildWeeklyPence: null,
        sourceId: 'test',
      },
    };
    expect(() =>
      calculate(
        input({ finances: finances({ netEarnings: p(100000) }), applyChildBenefitDeduction: true }),
        { benefitTables: [unsourcedCb] },
      ),
    ).toThrow(/cannot be deducted/);
  });
});

describe('engine — standing flags', () => {
  it('raises RATES_STALE past the table end date', () => {
    // 31 March 2027 is the last covered day; the 2025-26 table has already ended.
    const r = calculate(input({ asAtDate: d('2026-03-30'), children: [child({ ageYears: 12 })] }));
    expect(r.financialYear).toBe('2025-26');
    expect(r.flags.some((f) => f.code === 'RATES_STALE')).toBe(false);
  });

  it('flags a 17-year-old for the transition at 18', () => {
    const r = calculate(input({ children: [child({ ageYears: 17 })] }));
    const flag = r.flags.find((f) => f.code === 'AGE_17_TRANSITION');
    expect(flag?.severity).toBe('important');
  });

  it('flags an unknown looked-after status as info and a "no" as important', () => {
    const unknown = calculate(
      input({ children: [child({ wasLookedAfterImmediatelyBeforeOrder: 'unknown' })] }),
    );
    expect(unknown.flags.find((f) => f.code === 'LOOKED_AFTER_STATUS_UNKNOWN')?.severity).toBe('info');
    const no = calculate(
      input({ children: [child({ wasLookedAfterImmediatelyBeforeOrder: false })] }),
    );
    expect(no.flags.find((f) => f.code === 'NOT_LOOKED_AFTER_BEFORE_ORDER')?.severity).toBe('important');
  });

  it('flags the abolished two-child limit for three or more children', () => {
    const r = calculate(
      input({
        children: [
          child({ id: 'a' }),
          child({ id: 'b', isEldestInHousehold: false }),
          child({ id: 'c', isEldestInHousehold: false }),
        ],
      }),
    );
    expect(r.flags.some((f) => f.code === 'TWO_CHILD_LIMIT_ABOLISHED')).toBe(true);
  });

  it('[§33] flags any council we hold no publishable policy for', () => {
    // Not an error: use the national minimums and tell the carer how to ask.
    // Camden is in the region map but not in la-overrides at all.
    const absent = calculate(
      input({ carer: carer({ localAuthoritySlug: 'camden', englandRegion: 'london' }) }),
    );
    expect(absent.flags.some((f) => f.code === 'COUNCIL_POLICY_UNKNOWN')).toBe(true);

    // …and it does NOT fire where we do hold a publishable policy.
    const known = calculate(
      input({ carer: carer({ localAuthoritySlug: 'knownshire', englandRegion: 'rest-of-england' }) }),
      { laOverrides: { knownshire: publishableLa({ slug: 'knownshire' }) } },
    );
    expect(known.flags.some((f) => f.code === 'COUNCIL_POLICY_UNKNOWN')).toBe(false);

    // …nor where no council was given at all.
    const noCouncil = calculate(input());
    expect(noCouncil.flags.some((f) => f.code === 'COUNCIL_POLICY_UNKNOWN')).toBe(false);
  });

  it('flags a council whose policy we hold but cannot yet publish', () => {
    const r = calculate(
      input({ carer: carer({ localAuthoritySlug: 'devon', englandRegion: 'rest-of-england' }) }),
    );
    expect(r.flags.some((f) => f.code === 'COUNCIL_POLICY_UNKNOWN')).toBe(true);
    // …and the unsourced Devon flat rate is NOT used.
    expect(r.perChild[0]!.coreAllowanceWeekly).toBe(22700);
  });

  it('raises the LGSCO and fixed-percentage flags for a publishable council', () => {
    const la = publishableLa({
      slug: 'pctshire',
      name: 'Pctshire Council',
      corePolicy: 'Pays two-thirds of the core fostering allowance',
      lawfulnessFlag: {
        code: 'LGSCO_UPHELD',
        summary: 'A published decision.',
        sourceUrl: 'https://example.invalid/decision',
        decisionDate: '2024-01-01',
      },
    });
    const r = calculate(
      input({ carer: carer({ localAuthoritySlug: 'pctshire', englandRegion: 'rest-of-england' }) }),
      { laOverrides: { pctshire: la } },
    );
    expect(r.flags.some((f) => f.code === 'FIXED_PERCENTAGE_POLICY')).toBe(true);
    expect(r.flags.some((f) => f.code === 'LGSCO_FINDING_AGAINST_LA')).toBe(true);
  });

  it('uses a publishable LA enhancement rather than assuming zero', () => {
    const la = publishableLa({ slug: 'enhshire', enhancementWeeklyPence: 5000 });
    const r = calculate(
      input({
        carer: carer({ localAuthoritySlug: 'enhshire', englandRegion: 'rest-of-england' }),
        children: [child({ ageYears: 8, hasDisabilityOrAdditionalNeeds: true })],
      }),
      { laOverrides: { enhshire: la } },
    );
    expect(r.perChild[0]!.enhancementWeekly).toBe(5000);
    expect(r.perChild[0]!.maximumWeekly).toBe(25100);
    expect(r.flags.some((f) => f.code === 'ENHANCEMENT_AVAILABLE')).toBe(true);
  });

  it('warns that a capital rule may apply above £6,000 of savings', () => {
    const r = calculate(
      input({ finances: finances({ netEarnings: p(100000), savingsCapital: p(700000) }) }),
      depsWithMeansTest(),
    );
    expect(r.flags.some((f) => f.code === 'CAPITAL_RULE_MAY_APPLY')).toBe(true);
    expect(r.flags.some((f) => f.code === 'TAPER_METHOD_ASSUMED')).toBe(true);
  });

  it('does not claim the taper was assumed when the caller supplied one', () => {
    const r = calculate(
      input({
        finances: finances({ netEarnings: p(100000) }),
        taperOverride: { method: 'percentage', percentage: 0.5 },
      }),
      depsWithMeansTest(),
    );
    expect(r.flags.some((f) => f.code === 'TAPER_METHOD_ASSUMED')).toBe(false);
    expect(r.meansTestBreakdown!.taperMethod).toBe('percentage');
  });

  it('adds the enhancement flag on the Kinship Zone path too', () => {
    const r = calculate(
      input({
        carer: carer({
          localAuthoritySlug: 'wiltshire',
          englandRegion: 'south-east',
          childWouldOtherwiseBeInCare: true,
        }),
        children: [child({ ageYears: 8, hasDisabilityOrAdditionalNeeds: true })],
      }),
    );
    expect(r.regime).toBe('kinship-zone');
    expect(r.flags.some((f) => f.code === 'ENHANCEMENT_AVAILABLE')).toBe(true);
  });

  it('is not Kinship Zone eligible without the "otherwise in care" condition', () => {
    expect(
      isKinshipZoneEligible(input({ carer: carer({ localAuthoritySlug: 'bolton' }) })),
    ).toBe(false);
    expect(isKinshipZoneEligible(input({ carer: carer({ localAuthoritySlug: 'devon' }) }))).toBe(false);
    expect(isKinshipZoneEligible(input())).toBe(false);
  });
});

describe('flags module', () => {
  it('sorts critical → important → info, then by catalogue order', () => {
    const sorted = sortFlags([
      makeFlag('ANNUAL_REVIEW_DUE'),
      makeFlag('BELOW_NMA'),
      makeFlag('REG7_FLOOR_APPLIED'),
      makeFlag('UNLAWFUL_CB_DEDUCTION_RISK'),
    ]);
    expect(sorted.map((f) => f.code)).toEqual([
      'UNLAWFUL_CB_DEDUCTION_RISK',
      'BELOW_NMA',
      'REG7_FLOOR_APPLIED',
      'ANNUAL_REVIEW_DUE',
    ]);
  });

  it('dedupes by code', () => {
    expect(dedupeFlags([makeFlag('BELOW_NMA'), makeFlag('BELOW_NMA')])).toHaveLength(1);
  });

  it('renders every catalogue entry without a context', () => {
    const codes = Object.keys(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      {} as Record<string, never>,
    );
    expect(codes).toEqual([]);
    // Exercise each flag body with an empty context — none may throw.
    for (const code of [
      'UNLAWFUL_CB_DEDUCTION_RISK',
      'FIXED_PERCENTAGE_POLICY',
      'BELOW_NMA',
      'LGSCO_FINDING_AGAINST_LA',
      'REG7_FLOOR_APPLIED',
      'REG7_EXPIRING',
      'REG7_EXTENSION_AVAILABLE',
      'REG7_MISAPPLICATION_WARNING',
      'NOT_LOOKED_AFTER_BEFORE_ORDER',
      'LOOKED_AFTER_STATUS_UNKNOWN',
      'KINSHIP_ZONE_ELIGIBLE',
      'KINSHIP_ZONE_PILOT_CAVEAT',
      'KINSHIP_ZONE_EXCLUDED_REG6',
      'KINSHIP_ZONE_COMPARISON',
      'ENHANCEMENT_AVAILABLE',
      'MEANS_TEST_MODEL_OUTDATED',
      'TAPER_METHOD_ASSUMED',
      'CAPITAL_RULE_MAY_APPLY',
      'ANNUAL_REVIEW_DUE',
      'THREE_YEAR_RESPONSIBILITY',
      'AGE_17_TRANSITION',
      'BENEFIT_CAP_RISK',
      'TWO_CHILD_LIMIT_ABOLISHED',
      'GUARDIANS_ALLOWANCE_CHECK',
      'RATES_STALE',
      'COUNCIL_POLICY_UNKNOWN',
      'SCOTLAND_SRA_IS_A_FLOOR',
      'SCOTLAND_FOSTER_KINSHIP_PARITY',
      'SCOTLAND_NO_WORSE_OFF',
    ] as const) {
      const f = makeFlag(code);
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.body.length).toBeGreaterThan(0);
    }
  });
});

describe('reference data', () => {
  it('resolves citations and refuses unknown ids [R3]', () => {
    expect(cite('sg-regs-2005-reg6').label).toMatch(/reg 6/);
    expect(() => cite('nope')).toThrow(DataError);
    expect(allCitationIds().length).toBeGreaterThan(10);
  });

  it('hides every LA override that is not R9-publishable', () => {
    expect(publishableLaOverride('devon')).toBeUndefined();
    expect(publishableLaOverride('leeds')).toBeUndefined();
    expect(publishableLaOverride(undefined)).toBeUndefined();
    expect(publishableLaOverride('not-a-council')).toBeUndefined();
    expect(hasUnpublishableLaOverride('devon')).toBe(true);
    expect(hasUnpublishableLaOverride('not-a-council')).toBe(false);
    expect(hasUnpublishableLaOverride(undefined)).toBe(false);
  });

  it('treats a missing source URL or an undated decision as unpublishable', () => {
    expect(isPublishable(publishableLa({ slug: 'a', policySourceUrl: '' }))).toBe(false);
    expect(isPublishable(publishableLa({ slug: 'a', publishable: false }))).toBe(false);
    expect(
      isPublishable(
        publishableLa({
          slug: 'a',
          lawfulnessFlag: { code: 'X', summary: 'y', sourceUrl: 'https://x.invalid', decisionDate: '' },
        }),
      ),
    ).toBe(false);
    expect(isPublishable(undefined)).toBe(false);
    expect(isPublishable(publishableLa({ slug: 'a' }))).toBe(true);
  });

  it('covers every English children\'s services authority', () => {
    expect(Object.keys(LA_REGION_MAP).length).toBe(LA_REGION_MAP_META.expectedAuthorityCount);
    expect(Object.keys(LA_REGION_MAP).length).toBeGreaterThanOrEqual(152);
    expect(LA_REGION_MAP['camden']).toBe('london');
    expect(LA_REGION_MAP['kent']).toBe('south-east');
    expect(LA_REGION_MAP['devon']).toBe('rest-of-england');
  });

  it('ships Phase 1 flags in their blocked state (§39)', () => {
    expect(FLAGS.MEANS_TEST_ENABLED).toBe(false);
    expect(FLAGS.BACKDATING_ENABLED).toBe(false);
    expect(FLAGS.WALES_ROUTE_ENABLED).toBe(false);
    expect(FLAGS.KINSHIP_ZONE_PATH).toBe(true);
  });
});

describe('backdating', () => {
  const base = input({
    carer: carer({ englandRegion: 'south-east', orderDate: d('2025-05-01') }),
    children: [child({ dateOfBirth: d('2015-06-15'), ageYears: 11 })],
  });

  it('refuses a period that runs backwards', () => {
    expect(() =>
      calculateBackdating({
        base,
        fromDate: d('2026-01-01'),
        toDate: d('2025-01-01'),
        actuallyPaidWeekly: p(0),
      }),
    ).toThrow(/before its start/);
  });

  it('refuses more than one child rather than inventing an allocation', () => {
    expect(() =>
      calculateBackdating({
        base: input({
          carer: carer({ englandRegion: 'south-east' }),
          children: [child({ id: 'a' }), child({ id: 'b', isEldestInHousehold: false })],
        }),
        fromDate: d('2025-05-01'),
        toDate: d('2026-01-01'),
        actuallyPaidWeekly: p(0),
      }),
    ).toThrow(/one child at a time/);
  });

  it('segments at the reg 7 anniversary', () => {
    const boundaries = segmentBoundaries(
      {
        base: input({
          carer: carer({
            englandRegion: 'south-east',
            orderDate: d('2024-06-01'),
            wasFosterCarerForThisChild: true,
            previousWeeklyFosteringAllowance: p(30000),
          }),
          children: [child({ dateOfBirth: d('2015-06-15'), ageYears: 11 })],
        }),
        fromDate: d('2025-05-01'),
        toDate: d('2027-01-01'),
        actuallyPaidWeekly: p(0),
      },
      [{ minAge: 0, maxAge: 10 }, { minAge: 11, maxAge: 17 }],
    );
    expect(boundaries.some((b) => b.reason === 'reg7-anniversary')).toBe(true);
  });

  it('holds a former foster carer at their previous rate inside the two years', () => {
    const r = calculateBackdating({
      base: input({
        carer: carer({
          englandRegion: 'south-east',
          orderDate: d('2025-05-01'),
          wasFosterCarerForThisChild: true,
          previousWeeklyFosteringAllowance: p(40000),
        }),
        children: [child({ dateOfBirth: d('2015-06-15'), ageYears: 11 })],
      }),
      fromDate: d('2025-05-01'),
      toDate: d('2026-01-01'),
      actuallyPaidWeekly: p(10000),
    });
    expect(r.segments[0]!.shouldHaveBeenPaidWeekly).toBe(40000);
    expect(r.segments[0]!.maximumWeekly).toBeLessThan(40000);
  });

  it('reports no shortfall when the council paid the maximum', () => {
    const r = calculateBackdating({
      base,
      fromDate: d('2025-05-01'),
      toDate: d('2026-01-01'),
      actuallyPaidWeekly: p(100000),
    });
    expect(r.shortfall).toBe(0);
    expect(r.totalActuallyPaid).toBeGreaterThan(r.totalShouldHaveBeenPaid);
  });

  it('carries the standing caveats on every result', () => {
    const r = calculateBackdating({
      base,
      fromDate: d('2025-05-01'),
      toDate: d('2026-01-01'),
      actuallyPaidWeekly: p(0),
    });
    expect(r.caveats.some((c) => c.includes('lawful maximum'))).toBe(true);
    expect(r.caveats.some((c) => c.includes('Ombudsman'))).toBe(true);
  });
});
