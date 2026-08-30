/**
 * Guardrails — spec §15.
 *
 * Rules R1, R2, R4 and R5 are implemented here as RUNTIME ASSERTIONS, not as UI
 * copy. If the engine computes a violating result it throws, and the UI falls
 * back to "we can't estimate this — here's who to contact".
 *
 * UI contract: a GuardrailViolation is never shown raw to a user. The results
 * component catches it, logs the rule code (and no user data), and renders the
 * fallback plus the advice-line block.
 */

import { todayUtc } from './dates.js';
import { EngineError } from './errors.js';
import { withinReg7Window } from './resolve.js';
import type { CalculatorInput, CalculatorResult } from './types.js';

export class GuardrailViolation extends EngineError {
  constructor(
    public readonly rule: string,
    message: string,
  ) {
    super(`[${rule}] ${message}`);
  }
}

/** The fixed fractions that have been litigated. See R1. */
const SUSPICIOUS_RATIOS = [2 / 3, 0.58, 0.75, 0.5];

const ENGLISH_CITATION_IDS = [
  'sg-regs-2005-reg5',
  'sg-regs-2005-reg6',
  'sg-regs-2005-reg7',
  'sg-regs-2005-reg9',
  'sg-regs-2005-reg10-11',
  'dfe-guidance-2017-para65',
  'lewisham-2008',
  'kirklees-2010',
  'merton-2012',
  'tower-hamlets-2013',
  'lgsco-devon-2024',
  'lgsco-southend-2020',
  'lgsco-north-tyneside-17002928',
];

export function assertGuardrails(input: CalculatorInput, result: CalculatorResult): void {
  // Resolve the carer's position exactly as the engine did — see resolve.ts.
  const asAt = input.asAtDate ?? todayUtc();
  const insideReg7Window = withinReg7Window(input.carer, asAt);

  // [R5] Scotland must never be routed through the SGO engine.
  if (input.carer.nation === 'scotland' && result.regime !== 'scotland-kinship') {
    throw new GuardrailViolation('R5', 'Scotland routed through the SGO engine');
  }
  if (result.regime === 'scotland-kinship') {
    if (input.carer.nation !== 'scotland') {
      throw new GuardrailViolation('R5', 'Non-Scottish input routed to the Scottish kinship regime');
    }
    for (const c of result.perChild) {
      if (c.citations.some((x) => ENGLISH_CITATION_IDS.includes(x.id))) {
        throw new GuardrailViolation('R5', 'English citation attached to a Scottish result');
      }
    }
    for (const f of result.flags) {
      if (f.citation && ENGLISH_CITATION_IDS.includes(f.citation.id)) {
        throw new GuardrailViolation('R5', 'English citation attached to a Scottish result flag');
      }
    }
  }

  for (const c of result.perChild) {
    // [R1] Never output a fixed percentage of the fostering rate as "the answer".
    if (!result.meansTestApplied && c.maximumWeekly > 0) {
      const ratio = c.estimatedAllowanceWeekly / c.maximumWeekly;
      if (SUSPICIOUS_RATIOS.some((r) => Math.abs(ratio - r) < 0.001)) {
        throw new GuardrailViolation('R1', `Fixed-fraction output (${ratio}) without a means test`);
      }
    }

    // [R3] Every numeric output carries the citation it derives from.
    if (c.citations.length === 0) {
      throw new GuardrailViolation('R3', `Uncited figure for child ${c.childId}`);
    }

    // [R4] A former foster carer must never be shown a figure below their
    // previous fostering allowance within 24 months of the order.
    const prev = input.carer.previousWeeklyFosteringAllowance;
    if (insideReg7Window && prev !== undefined && c.estimatedAllowanceWeekly < prev) {
      throw new GuardrailViolation('R4', 'Below the reg 7 former foster carer floor');
    }

    // No negative allowances, ever.
    if (c.estimatedAllowanceWeekly < 0) {
      throw new GuardrailViolation('SANITY', 'Negative allowance');
    }

    // The estimate cannot exceed the maximum unless a floor was applied.
    if (c.estimatedAllowanceWeekly > c.maximumWeekly && c.floorApplied === null) {
      throw new GuardrailViolation('SANITY', 'Estimate exceeds maximum with no floor applied');
    }
  }

  // [R2] A Child Benefit deduction must never be silent.
  const deducted = result.perChild.some((c) => c.childBenefitDeductionWeekly > 0);
  if (deducted && !input.applyChildBenefitDeduction) {
    throw new GuardrailViolation('R2', 'Child Benefit deducted without explicit opt-in');
  }
  if (
    deducted &&
    input.carer.onMeansTestedBenefits &&
    !result.flags.some((f) => f.code === 'UNLAWFUL_CB_DEDUCTION_RISK')
  ) {
    throw new GuardrailViolation(
      'R2',
      'CB deducted from a means-tested claimant without a critical flag',
    );
  }
}
