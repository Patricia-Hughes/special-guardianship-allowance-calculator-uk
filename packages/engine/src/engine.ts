/**
 * The calculation entry point, spec §13.
 *
 * Pure. No DOM, no network, integer pence throughout. This file only routes;
 * the arithmetic lives in the regime module the routing picks.
 *
 *   validate → select rate table → select benefit table (independently, §11)
 *     → Scotland?     → regimes/scotland
 *     → Kinship Zone? → regimes/kinshipZone
 *     → otherwise       regimes/sgo   (England, Wales, Northern Ireland)
 *
 * The two table selections are independent because they have different
 * effective dates. Deriving one from the other would silently apply a benefit
 * figure from the wrong year.
 */

import { isKinshipZoneEligible } from './councilPolicy.js';
import { defaultDeps, resolveDeps, type EngineDeps } from './deps.js';
import { selectBenefitTable, selectRateTable, todayUtc } from './dates.js';
import { kinshipZonePath } from './regimes/kinshipZone.js';
import { scotlandPath } from './regimes/scotland.js';
import { sgoPath } from './regimes/sgo.js';
import { ageOf, monthsSinceOrder } from './resolve.js';
import { parseCalculatorInput } from './schema.js';
import type { BenefitTable, CalculatorInput, CalculatorResult } from './types.js';

export function calculate(
  rawInput: CalculatorInput,
  depsOverride?: Partial<EngineDeps>,
): CalculatorResult {
  const input = parseCalculatorInput(rawInput);
  const deps = resolveDeps(depsOverride);
  const asAt = input.asAtDate ?? todayUtc();

  const rates = selectRateTable(deps.rateTables, asAt);

  // The benefit table is looked up only where something reads it, which is the
  // means test and the Child Benefit deduction. It used to be selected here,
  // before the routing, so a date with no benefit table refused every path
  // including the ones that never touch one: a Scottish carer asking about an
  // earlier year was turned away over a table their result does not use.
  const benefitsFor = (): BenefitTable => selectBenefitTable(deps.benefitTables, asAt);

  if (input.carer.nation === 'scotland') return scotlandPath(input, rates, asAt, deps);
  if (isKinshipZoneEligible(input, deps)) return kinshipZonePath(input, rates, asAt, deps);
  return sgoPath(input, rates, benefitsFor, asAt, deps);
}

export { defaultDeps, type EngineDeps };
export { isKinshipZoneEligible };
export { lookupRate, regimeFor, resolveAgeBand, resolveEnglandRegion } from './rates.js';
export { ageOf, monthsSinceOrder };
