/**
 * The flags that are true of an SGO result regardless of the numbers.
 *
 * Everything here is driven off recorded data or off the carer's own answers,
 * so a warning disappears by itself the day the underlying fact changes.
 */

import { councilNameFor } from './councilPolicy.js';
import type { EngineDeps } from './deps.js';
import { makeFlag } from './flags.js';
import { publishableLaOverrideIn } from './referenceData.js';
import { REG7_WINDOW_MONTHS, ageOf, monthsSinceOrder } from './resolve.js';
import type { CalculatorInput, Flag, IsoDate, RateTable } from './types.js';

/** How long before the reg 7 window closes the carer should be warned. */
const REG7_EXPIRING_FROM_MONTHS = 18;
/** How long a council keeps a duty to the child after the order (spec §17). */
const CONTINUING_RESPONSIBILITY_MONTHS = 36;
/** Three or more dependent children is where the abolished limit used to bite. */
const TWO_CHILD_LIMIT_THRESHOLD = 3;

export function standingFlags(
  input: CalculatorInput,
  asAt: IsoDate,
  rates: RateTable,
  deps: EngineDeps,
): Flag[] {
  return [
    ...rateTableFlags(input, asAt, rates),
    ...childFlags(input, asAt),
    ...carerHistoryFlags(input, asAt),
    ...householdFlags(input),
    ...councilCoverageFlags(input, deps),
  ];
}

function rateTableFlags(input: CalculatorInput, asAt: IsoDate, rates: RateTable): Flag[] {
  const flags: Flag[] = [];

  if (asAt > rates.effectiveTo) {
    flags.push(makeFlag('RATES_STALE', { effectiveTo: rates.effectiveTo }));
  }

  // Wales pays more for an under-5 than for a 5-15 year old, which reads as a
  // bug to anyone who has seen any other UK rate table. Driven off the data, so
  // the warning goes the day the Welsh Government's circular either confirms
  // the figures or corrects them.
  if (input.carer.nation === 'wales' && rates.wales?.anomalyConfirmed === true) {
    flags.push(makeFlag('WALES_BAND_ORDER_ANOMALY'));
  }

  // 1 to 5 April: councils uplift from 1 April, the DfE states the rates for a
  // tax year starting 6 April. Both are right, so rather than pick a side
  // silently we serve the council convention, which is what the carer is
  // actually paid, and say that the other reading exists.
  const { councilApplicationFrom, dfeStatedTaxYearFrom } = rates;
  if (
    councilApplicationFrom !== undefined &&
    dfeStatedTaxYearFrom !== undefined &&
    asAt >= councilApplicationFrom &&
    asAt < dfeStatedTaxYearFrom
  ) {
    flags.push(makeFlag('APRIL_RATE_BOUNDARY'));
  }

  return flags;
}

function childFlags(input: CalculatorInput, asAt: IsoDate): Flag[] {
  const flags: Flag[] = [];
  for (const child of input.children) {
    if (child.wasLookedAfterImmediatelyBeforeOrder === false) {
      flags.push(makeFlag('NOT_LOOKED_AFTER_BEFORE_ORDER'));
    }
    if (child.wasLookedAfterImmediatelyBeforeOrder === 'unknown') {
      flags.push(makeFlag('LOOKED_AFTER_STATUS_UNKNOWN'));
    }
    if (ageOf(child, asAt) === 17) {
      flags.push(makeFlag('AGE_17_TRANSITION'));
    }
  }
  return flags;
}

function carerHistoryFlags(input: CalculatorInput, asAt: IsoDate): Flag[] {
  const flags: Flag[] = [];
  const months = monthsSinceOrder(input.carer, asAt);

  if (input.carer.wasFosterCarerForThisChild) {
    flags.push(makeFlag('REG7_EXTENSION_AVAILABLE'));
    flags.push(makeFlag('REG7_MISAPPLICATION_WARNING'));
    if (months >= REG7_EXPIRING_FROM_MONTHS && months < REG7_WINDOW_MONTHS) {
      flags.push(makeFlag('REG7_EXPIRING', { monthsSinceOrder: months }));
    }
  }

  if (months < CONTINUING_RESPONSIBILITY_MONTHS) {
    flags.push(makeFlag('THREE_YEAR_RESPONSIBILITY'));
  }

  flags.push(makeFlag('ANNUAL_REVIEW_DUE'));
  flags.push(makeFlag('GUARDIANS_ALLOWANCE_CHECK'));
  return flags;
}

function householdFlags(input: CalculatorInput): Flag[] {
  const householdChildren = input.finances?.dependentChildrenInHousehold ?? input.children.length;
  return householdChildren >= TWO_CHILD_LIMIT_THRESHOLD
    ? [makeFlag('TWO_CHILD_LIMIT_ABOLISHED')]
    : [];
}

/**
 * [§33] A council we hold no publishable policy for is not an error. Use the
 * national minimums and say so. This covers both a council absent from
 * la-overrides entirely and one seeded but held back for want of a source URL
 * (ADR-0001). From the carer's point of view they are the same situation.
 */
function councilCoverageFlags(input: CalculatorInput, deps: EngineDeps): Flag[] {
  const slug = input.carer.localAuthoritySlug;
  if (!slug || publishableLaOverrideIn(deps.laOverrides, slug)) return [];
  return [makeFlag('COUNCIL_POLICY_UNKNOWN', { councilName: councilNameFor(slug, deps) })];
}
