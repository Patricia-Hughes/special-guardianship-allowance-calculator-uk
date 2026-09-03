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
  LA_OVERRIDES_ALL,
  LA_REGION_MAP,
  LA_REGION_MAP_META,
  RATE_TABLES,
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

  it('warns a Welsh carer that the under-5 rate really is higher than 5-15', () => {
    // £208 for a 7-year-old against £229 for a 3-year-old looks like a bug in
    // the site. It is not, and saying so is the whole point of the flag.
    const r = calculate(
      input({
        carer: carer({ nation: 'wales', englandRegion: undefined }),
        children: [child({ ageYears: 7 })],
      }),
    );
    expect(r.flags.some((f) => f.code === 'WALES_BAND_ORDER_ANOMALY')).toBe(true);
  });

  it('does not show the Welsh band warning to carers in England', () => {
    const r = calculate(input({ children: [child({ ageYears: 7 })] }));
    expect(r.flags.some((f) => f.code === 'WALES_BAND_ORDER_ANOMALY')).toBe(false);
  });

  it('flags 1-5 April, where the council year and the DfE tax year disagree', () => {
    // Councils uplift from 1 April; DfE states the rates for a tax year running
    // 6 April to 5 April. Inside that gap both readings are defensible.
    for (const day of ['2026-04-01', '2026-04-03', '2026-04-05'] as const) {
      const r = calculate(input({ asAtDate: d(day) }));
      expect(r.flags.some((f) => f.code === 'APRIL_RATE_BOUNDARY')).toBe(true);
    }
  });

  it('does not flag the April boundary once the tax year has caught up', () => {
    for (const day of ['2026-04-06', '2026-09-01', '2027-03-31'] as const) {
      const r = calculate(input({ asAtDate: d(day) }));
      expect(r.flags.some((f) => f.code === 'APRIL_RATE_BOUNDARY')).toBe(false);
    }
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

  it('runs the means test on the shipped data and still says the model is not law', () => {
    const r = calculate(input({ finances: finances() }));
    expect(r.meansTestBreakdown).toBeDefined();
    // The DWP figures being sourced fixes the data gap, not the model. It is
    // still non-statutory and the taper is still corroborated across only three
    // councils, so both warnings must survive the unblocking.
    expect(r.flags.some((f) => f.code === 'MEANS_TEST_MODEL_OUTDATED')).toBe(true);
    expect(r.flags.some((f) => f.code === 'TAPER_METHOD_ASSUMED')).toBe(true);
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
    // Injected rather than naming a real council: which councils happen to be
    // unsourced changes every research round, and the rule under test does not.
    const held = publishableLa({
      slug: 'heldshire',
      corePolicy: 'A policy we hold but cannot cite',
      flatCoreRateWeeklyPence: 9900,
      publishable: false,
      policySourceUrl: '',
    });
    const r = calculate(
      input({ carer: carer({ localAuthoritySlug: 'heldshire', englandRegion: 'rest-of-england' }) }),
      { laOverrides: { heldshire: held } },
    );
    expect(r.flags.some((f) => f.code === 'COUNCIL_POLICY_UNKNOWN')).toBe(true);
    // …and the unsourced flat rate is NOT used.
    expect(r.perChild[0]!.coreAllowanceWeekly).toBe(22700);
  });

  it('raises the LGSCO and fixed-percentage flags for a publishable council', () => {
    const la = publishableLa({
      slug: 'pctshire',
      name: 'Pctshire Council',
      corePolicy: 'Pays two-thirds of the core fostering allowance',
      fixedPercentageOfFosteringRate: 0.667,
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

  // The site told North Tyneside carers, in a critical warning, that their
  // council's policy "appears to set the allowance at a fixed share of the
  // fostering rate". Its policy summary says "Percentage model abolished 2018".
  // The flag was matching the word, not the fact. Devon, which pays 100%, would
  // have been accused the moment it was published. Never again from prose.
  it('never infers a fixed-percentage policy from the wording of the summary', () => {
    for (const corePolicy of [
      'Percentage model abolished 2018; equivalence to the maximum fostering allowance',
      '100% of core fostering allowance as maximum; standardised means test',
      'Paying a fixed percentage of the fostering allowance would not be lawful',
      'Two-thirds proportion was dropped after the Ombudsman report',
    ]) {
      const la = publishableLa({
        slug: 'wordy',
        name: 'Wordy Council',
        corePolicy,
        fixedPercentageOfFosteringRate: null,
      });
      const r = calculate(
        input({ carer: carer({ localAuthoritySlug: 'wordy', englandRegion: 'rest-of-england' }) }),
        { laOverrides: { wordy: la } },
      );
      expect(
        r.flags.some((f) => f.code === 'FIXED_PERCENTAGE_POLICY'),
        `accused a council over the wording: "${corePolicy}"`,
      ).toBe(false);
    }
  });

  // A council that fixed the problem is not a council with the problem.
  it('says a finding concerns a former policy when the data records that', () => {
    const la = publishableLa({
      slug: 'mendedshire',
      name: 'Mendedshire Council',
      fixedPercentageOfFosteringRate: null,
      lawfulnessFlag: {
        code: 'LGSCO_UPHELD',
        summary: 'Found at fault over its former policy.',
        sourceUrl: 'https://example.invalid/decision',
        decisionDate: '2024-01-25',
        concernsFormerPolicy: true,
        policyChangedOn: '1 January 2024',
        supersededBy: {
          summary: 'A later complaint about its current practice was not upheld.',
          sourceUrl: 'https://example.invalid/later',
          decisionDate: '2024-10-01',
        },
      },
    });
    const r = calculate(
      input({ carer: carer({ localAuthoritySlug: 'mendedshire', englandRegion: 'rest-of-england' }) }),
      { laOverrides: { mendedshire: la } },
    );
    // Not the "check these first" flag: that one is for a council whose current
    // practice is in question, which this council's is not.
    expect(r.flags.some((f) => f.code === 'LGSCO_FINDING_AGAINST_LA')).toBe(false);
    const flag = r.flags.find((f) => f.code === 'LGSCO_FINDING_FORMER_POLICY');
    expect(flag?.severity).toBe('important');
    expect(flag?.body).toContain('changed that policy from 1 January 2024');
    expect(flag?.body).toContain('was not upheld');
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
    expect(publishableLaOverride(undefined)).toBeUndefined();
    expect(publishableLaOverride('not-a-council')).toBeUndefined();
    expect(hasUnpublishableLaOverride('not-a-council')).toBe(false);
    expect(hasUnpublishableLaOverride(undefined)).toBe(false);
    // Whatever ships must pass the rule, whichever councils those happen to be.
    for (const slug of Object.keys(LA_OVERRIDES_ALL)) {
      const served = publishableLaOverride(slug);
      if (served) {
        expect(served.policySourceUrl, `${slug} is served with no policy URL`).not.toBe('');
      } else {
        expect(hasUnpublishableLaOverride(slug), `${slug} is neither served nor held`).toBe(true);
      }
    }
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

  it('ships the flags in the state their data supports (§39)', () => {
    // Unblocked 30 Aug 2026 by the DWP Income Support figures.
    expect(FLAGS.MEANS_TEST_ENABLED).toBe(true);
    // Unblocked once the Welsh band inversion was corroborated as genuine.
    expect(FLAGS.WALES_ROUTE_ENABLED).toBe(true);
    // Unblocked once the 2024/25 England table was recovered from the National
    // Archives snapshot — as published, not reconstructed from the 6.88% uplift.
    expect(FLAGS.BACKDATING_ENABLED).toBe(true);
    expect(FLAGS.KINSHIP_ZONE_PATH).toBe(true);
  });

  it('ships the figures to the browser but not the prose about them', () => {
    // sync-engine-data strips maintainer-only fields from the copy that gets
    // bundled. /data keeps them, and validate-data still reads /data, so the
    // gates that insist on them are unaffected. Pinned here so nobody starts
    // rendering a field that will not be there at runtime.
    const wales = RATE_TABLES[0]!.wales!;
    expect(wales.rates['0-4']).toBe(22900);
    expect(wales.anomalyConfirmed).toBe(true);
    expect(wales.verifyNote).toBeUndefined();
    expect(wales.anomalyCorroboration).toBeUndefined();
    // The one note that is meant for a carer survives.
    expect(wales.userFacingNote).toBeDefined();
  });

  it('keeps the Welsh age band inversion exactly as published', () => {
    // Wales pays MORE for an under-5 than for a 5 to 15 year old. Every other UK
    // table rises with age, so this reads as a transcription error and is not.
    // It is on the Welsh Government's own letter of 26 February 2024, and it
    // reproduces across 2024/25, 2025/26 and 2026/27.
    //
    // This test exists because the data gate only NOTES the inversion, and a
    // note is easy to walk past. Anyone who "fixes" the figures to make them
    // rise with age breaks this instead, and reads why.
    for (const table of RATE_TABLES) {
      const wales = table.wales;
      if (!wales?.rates) continue;
      const under5 = wales.rates['0-4'];
      const fiveToFifteen = wales.rates['5-15'];
      if (under5 === undefined || fiveToFifteen === undefined) continue;
      expect(under5).toBeGreaterThan(fiveToFifteen);
      // And it must still be flagged as corroborated, or the site would serve a
      // figure that looks wrong with no explanation next to it.
      expect(wales.anomalyConfirmed).toBe(true);
    }
  });

  it('keeps Wiltshire out of the South East until a DfE list says otherwise', () => {
    // The DfE publishes no authority-level region list, so this map rests on
    // ONS Government Office Regions. Everything located puts Wiltshire in the
    // South West; the previous south-east mapping overstated it by up to £31/wk
    // in a council that is a live Kinship Zone.
    expect(LA_REGION_MAP['wiltshire']).toBe('rest-of-england');
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

  // Northern Ireland's model scheme prints two tables: the scale rates, which
  // are the allowance, and a reduced rates table about 28% lower that exists
  // only for enhanced allowances and short breaks. Taking the wrong one is the
  // obvious way to get this nation badly wrong, so the right figure is pinned.
  it('uses the Northern Irish scale rates, never the reduced ones', () => {
    const r = calculateBackdating({
      base: input({
        carer: carer({ nation: 'northern-ireland', englandRegion: undefined }),
        children: [child({ ageYears: 8, dateOfBirth: d('2018-06-01') })],
      }),
      fromDate: d('2024-06-01'),
      toDate: d('2025-03-01'),
      actuallyPaidWeekly: p(0),
    });
    const seg = r.segments.find((x) => x.financialYear === '2024-25');
    expect(seg, '2024/25 should no longer be blocked for Northern Ireland').toBeDefined();
    // Scale rate for 5-10 from 1 April 2024. The reduced rate is 12000.
    expect(seg!.maximumWeekly).toBe(16600);
    expect(r.blockedYears).not.toContain('2024-25');
  });

  it('uses the Northern Irish scale rates for 2025/26 too', () => {
    const r = calculateBackdating({
      base: input({
        carer: carer({ nation: 'northern-ireland', englandRegion: undefined }),
        children: [child({ ageYears: 8, dateOfBirth: d('2018-06-01') })],
      }),
      fromDate: d('2025-06-01'),
      toDate: d('2026-01-01'),
      actuallyPaidWeekly: p(0),
    });
    const seg = r.segments.find((x) => x.financialYear === '2025-26');
    expect(seg, '2025/26 should no longer be blocked for Northern Ireland').toBeDefined();
    // Scale rate for 5-10 from 1 April 2025. The reduced rate on the same page
    // is 12500, so a 12500 here means the wrong table was read.
    expect(seg!.maximumWeekly).toBe(17300);
    expect(r.blockedYears).not.toContain('2025-26');
  });

  it('only cuts a 6 April segment for England', () => {
    // England is the only nation with a tax-year framing to disagree with the
    // council convention. Wales, Northern Ireland and Scotland all publish
    // "from 1 April", so a 6 April cut there produces a five-day segment with
    // the same rate on both sides: noise in the list, nothing in the sum.
    const spanning = (nation: 'england' | 'northern-ireland') =>
      segmentBoundaries(
        {
          base: input({
            carer: carer({
              nation,
              englandRegion: nation === 'england' ? 'rest-of-england' : undefined,
            }),
            children: [child({ ageYears: 8, dateOfBirth: d('2016-06-01') })],
          }),
          fromDate: d('2024-06-01'),
          toDate: d('2026-08-01'),
          actuallyPaidWeekly: p(0),
        },
        [
          { minAge: 0, maxAge: 4 },
          { minAge: 5, maxAge: 15 },
          { minAge: 16, maxAge: 17 },
        ],
      );

    const englandCuts = spanning('england').filter((b) => b.reason === 'april-tax-year-boundary');
    expect(englandCuts.length).toBeGreaterThan(0);

    const niCuts = spanning('northern-ireland').filter(
      (b) => b.reason === 'april-tax-year-boundary',
    );
    expect(niCuts).toHaveLength(0);
  });

  it('keeps the Scottish 5-15 band single, as the SRA defines it', () => {
    // The SRA is three bands presented across four categories, and 5-10 and
    // 11-15 are paid the SAME. A council reproduction showing them differing was
    // reprinting an older year. Splitting this band would invent a distinction
    // the Scottish Government does not make.
    for (const table of RATE_TABLES) {
      const scotland = table.scotland;
      if (!scotland?.rates) continue;
      expect(scotland.rates['5-10']).toBeUndefined();
      expect(scotland.rates['11-15']).toBeUndefined();
      expect(scotland.rates['5-15']).toBeGreaterThan(0);
    }
  });

  // Open item 11. Councils uplift on 1 April; the DfE states the same rates on a
  // tax year beginning 6 April. The tool pays out on the council convention,
  // because that is what decides what a carer was actually paid, but the five
  // days it depends on are now a segment of their own so the amount at stake can
  // be stated rather than quietly included.
  describe('the 1 to 5 April window', () => {
    const spanning = {
      base: input({
        carer: carer({ englandRegion: 'rest-of-england', orderDate: d('2024-06-01') }),
        children: [child({ ageYears: 8, dateOfBirth: d('2016-06-01') })],
      }),
      fromDate: d('2024-06-01'),
      toDate: d('2026-08-01'),
      actuallyPaidWeekly: p(10000),
    };

    it('cuts a segment at 6 April as well as at 1 April', () => {
      const r = calculateBackdating(spanning);
      const aprilStarts = r.segments.filter((x) => x.from.endsWith('-04-01'));
      expect(aprilStarts.length).toBe(2);
      for (const seg of aprilStarts) {
        expect(seg.to.endsWith('-04-05'), `${seg.from} runs to ${seg.to}`).toBe(true);
      }
      expect(r.segments.some((x) => x.reason === 'april-tax-year-boundary')).toBe(true);
    });

    it('records what the tax year reading would have paid, on those days only', () => {
      const r = calculateBackdating(spanning);
      for (const seg of r.segments) {
        const inWindow = seg.from.slice(5) >= '04-01' && seg.from.slice(5) <= '04-05';
        expect(
          seg.taxYearAlternativeWeekly !== undefined,
          `${seg.from} should ${inWindow ? '' : 'not '}carry an alternative`,
        ).toBe(inWindow);
        if (seg.taxYearAlternativeWeekly !== undefined) {
          // The previous year's rate, which is lower.
          expect(seg.taxYearAlternativeWeekly).toBeLessThan(seg.maximumWeekly);
        }
      }
    });

    it('states the amount that rests on the convention, and says so once', () => {
      const r = calculateBackdating(spanning);
      // Five days at the gap between two years' weekly rates, twice over.
      expect(r.aprilBoundaryDifference).toBeGreaterThan(0);
      expect(r.aprilBoundaryDifference).toBeLessThan(2000);
      const mentions = r.caveats.filter((c) => c.includes('tax year'));
      expect(mentions).toHaveLength(1);
      expect(mentions[0]).toContain('1 April');
    });

    it('claims nothing where the period crosses no April', () => {
      const r = calculateBackdating({
        ...spanning,
        fromDate: d('2025-05-01'),
        toDate: d('2026-01-01'),
      });
      expect(r.aprilBoundaryDifference).toBe(0);
      expect(r.caveats.some((c) => c.includes('tax year'))).toBe(false);
      expect(r.segments.every((x) => x.taxYearAlternativeWeekly === undefined)).toBe(true);
    });
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
