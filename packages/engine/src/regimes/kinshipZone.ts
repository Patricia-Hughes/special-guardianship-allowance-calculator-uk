/**
 * The Kinship Zones pilot, spec §13.5.
 *
 * In a pilot area, a carer whose child would otherwise be in care gets the full
 * fostering national minimum allowance with no means test at all. So there is
 * no contribution, no deduction and no floor to apply: the rate is the answer.
 */

import { councilNameFor } from '../councilPolicy.js';
import type { EngineDeps } from '../deps.js';
import { makeFlag } from '../flags.js';
import { pence } from '../money.js';
import { citeRateSource, lookupRate, resolveAgeBand } from '../rates.js';
import { cite } from '../referenceData.js';
import { ageOf } from '../resolve.js';
import { finalise } from '../result.js';
import { standingFlags } from '../standingFlags.js';
import type { CalculatorInput, CalculatorResult, Flag, IsoDate, PerChildResult, RateTable } from '../types.js';

export function kinshipZonePath(
  input: CalculatorInput,
  rates: RateTable,
  asAt: IsoDate,
  deps: EngineDeps,
): CalculatorResult {
  const flags: Flag[] = [
    makeFlag('KINSHIP_ZONE_ELIGIBLE', {
      councilName: councilNameFor(input.carer.localAuthoritySlug, deps),
    }),
    makeFlag('KINSHIP_ZONE_PILOT_CAVEAT'),
    ...standingFlags(input, asAt, rates, deps),
  ];

  const perChild: PerChildResult[] = input.children.map((child) => {
    const band = resolveAgeBand(rates, input.carer.nation, child, asAt);
    const rate = lookupRate(rates, input.carer, band, deps);
    if (child.hasDisabilityOrAdditionalNeeds) flags.push(makeFlag('ENHANCEMENT_AVAILABLE'));
    return {
      childId: child.id,
      ageBand: band.id,
      ageAtCalculation: ageOf(child, asAt),
      coreAllowanceWeekly: rate,
      enhancementWeekly: pence(0),
      maximumWeekly: rate,
      assessedContributionWeekly: pence(0),
      childBenefitDeductionWeekly: pence(0),
      estimatedAllowanceWeekly: rate,
      floorApplied: 'kinship-zone-nma',
      citations: [
        // The rate table first: the pilot pays the full NMA, so the figure comes
        // from the fostering table and that is what a carer needs to be able to
        // check.
        citeRateSource(rates, input.carer.nation),
        cite('kinship-zones-2026'),
        cite('dfe-guidance-2017-para65'),
      ],
    };
  });

  return finalise(input, perChild, {
    regime: 'kinship-zone',
    rates,
    flags,
    meansTestApplied: false,
  });
}
