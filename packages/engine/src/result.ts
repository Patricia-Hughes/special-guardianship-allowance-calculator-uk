/**
 * Assembling the final result, and the last gate before it leaves the engine.
 *
 * Every path ends here, and every path therefore ends in assertGuardrails,
 * which throws rather than let a legally wrong figure reach a carer.
 */

import { dedupeFlags, sortFlags } from './flags.js';
import { assertGuardrails } from './guardrails.js';
import { add, weeklyToAnnual } from './money.js';
import { ENGINE_VERSION } from './referenceData.js';
import type {
  CalculatorInput,
  CalculatorResult,
  Flag,
  MeansTestBreakdown,
  PerChildResult,
  RateTable,
  Regime,
} from './types.js';

export interface FinaliseOptions {
  regime: Regime;
  rates: RateTable;
  flags: Flag[];
  meansTestApplied: boolean;
  meansTestBreakdown?: MeansTestBreakdown;
  warnings?: string[];
}

export function finalise(
  input: CalculatorInput,
  perChild: PerChildResult[],
  opts: FinaliseOptions,
): CalculatorResult {
  const totalWeekly = add(...perChild.map((c) => c.estimatedAllowanceWeekly));

  const result: CalculatorResult = {
    regime: opts.regime,
    financialYear: opts.rates.financialYear,
    ratesEffectiveFrom: opts.rates.effectiveFrom,
    perChild,
    totalWeekly,
    totalAnnual: weeklyToAnnual(totalWeekly),
    meansTestApplied: opts.meansTestApplied,
    flags: sortFlags(dedupeFlags(opts.flags)),
    warnings: opts.warnings ?? [],
    computedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    dataVersion: opts.rates.dataVersion,
  };
  if (opts.meansTestBreakdown) result.meansTestBreakdown = opts.meansTestBreakdown;

  assertGuardrails(input, result);
  return result;
}
