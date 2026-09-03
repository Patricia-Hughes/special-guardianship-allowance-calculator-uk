/**
 * Assembling the final result, and the last gate before it leaves the engine.
 *
 * Every path ends here, and every path therefore ends in assertGuardrails,
 * which throws rather than let a legally wrong figure reach a carer.
 */

import { dedupeFlags, sortFlags } from './flags.js';
import { GuardrailViolation, assertGuardrails } from './guardrails.js';
import { citeRateSource } from './rates.js';
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

  assertRateSourceIsCited(input, result, opts.rates);
  assertGuardrails(input, result);
  return result;
}

/**
 * [R3] Every figure names the table it came from.
 *
 * assertGuardrails only checks that a child HAS citations, so a result citing
 * four documents, none of which prints the figure, passed it. That is what the
 * page did: statutes and regulations, and no link to the rate table. The check
 * lives here rather than in guardrails.ts because this is the only place that
 * still knows which table was used.
 */
function assertRateSourceIsCited(
  input: CalculatorInput,
  result: CalculatorResult,
  rates: RateTable,
): void {
  const expected = citeRateSource(rates, input.carer.nation).id;
  for (const child of result.perChild) {
    if (!child.citations.some((c) => c.id === expected)) {
      throw new GuardrailViolation(
        'R3',
        `Child ${child.childId} shows a figure from "${expected}" without citing it`,
      );
    }
  }
}
