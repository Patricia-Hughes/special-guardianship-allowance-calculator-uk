/**
 * Scotland, spec §13.4.
 *
 * [HARD R5] No regulation 6, regulation 7, paragraph 65 or English case law may
 * be attached to a Scottish result. Special guardianship orders do not exist in
 * Scots law, and citing them at a Scottish kinship carer is worse than useless:
 * it sends them to argue a rule their council is not bound by.
 *
 * The Scottish Recommended Allowance is a floor, not a ceiling, which is why
 * the estimate here is the rate itself with no deduction of any kind.
 */

import type { EngineDeps } from '../deps.js';
import { makeFlag } from '../flags.js';
import { pence } from '../money.js';
import { citeRateSource, lookupRate, resolveAgeBand } from '../rates.js';
import { ageOf } from '../resolve.js';
import { finalise } from '../result.js';
import type { CalculatorInput, CalculatorResult, Flag, IsoDate, PerChildResult, RateTable } from '../types.js';

export function scotlandPath(
  input: CalculatorInput,
  rates: RateTable,
  asAt: IsoDate,
  deps: EngineDeps,
): CalculatorResult {
  const flags: Flag[] = [
    makeFlag('SCOTLAND_SRA_IS_A_FLOOR'),
    makeFlag('SCOTLAND_FOSTER_KINSHIP_PARITY'),
    makeFlag('SCOTLAND_NO_WORSE_OFF'),
  ];
  if (asAt > rates.effectiveTo) {
    flags.push(makeFlag('RATES_STALE', { effectiveTo: rates.effectiveTo }));
  }

  const perChild: PerChildResult[] = input.children.map((child) => {
    const band = resolveAgeBand(rates, 'scotland', child, asAt);
    const rate = lookupRate(rates, input.carer, band, deps);
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
      floorApplied: 'scottish-recommended-allowance',
      // The table actually used, not a hardcoded year. This named the 2026/27
      // source whatever year it had priced, so a figure from an earlier table
      // linked a page that does not contain it.
      citations: [citeRateSource(rates, 'scotland')],
    };
  });

  return finalise(input, perChild, {
    regime: 'scotland-kinship',
    rates,
    flags,
    meansTestApplied: false,
  });
}
