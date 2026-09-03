/**
 * Guardrails, spec §15.
 *
 * Rules R1 to R5 are runtime assertions here, not UI copy. If the engine
 * computes a violating result it throws, and the UI falls back to "we can't
 * estimate this, here is who to contact". A rule written only into the wording
 * of a page is a rule that stops being true the next time someone edits the
 * page.
 *
 * UI contract: a GuardrailViolation is never shown raw to a user. The results
 * component catches it, logs the rule code and no user data, and renders the
 * fallback plus the advice-line block.
 */

import { todayUtc } from './dates.js';
import { EngineError } from './errors.js';
import { withinReg7Window } from './resolve.js';
import type { CalculatorInput, CalculatorResult, PerChildResult } from './types.js';

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
/** How close to one of those counts as being that one. */
const RATIO_TOLERANCE = 0.001;

/**
 * Anything that only makes sense under English law. None of it may appear on a
 * Scottish result: special guardianship orders do not exist in Scots law, and
 * citing one sends a Scottish kinship carer to argue a rule their council is
 * not bound by.
 */
const ENGLISH_CITATION_IDS = [
  'sg-regs-2005-reg5',
  'sg-regs-2005-reg6',
  'sg-regs-2005-reg7',
  'sg-regs-2005-reg9',
  'sg-regs-2005-reg10',
  'sg-regs-2005-reg11',
  'sg-regs-2005-reg18',
  'ca1989-s14f-3',
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
  assertScotlandIsSeparate(input, result);

  // Resolve the carer's position exactly as the engine did, see resolve.ts.
  // Reading it differently here turns a correct result into a spurious
  // violation, which the UI shows as "we can't estimate this".
  const asAt = input.asAtDate ?? todayUtc();
  const insideReg7Window = withinReg7Window(input.carer, asAt);
  const previous = input.carer.previousWeeklyFosteringAllowance;

  for (const child of result.perChild) {
    assertNotAFixedFraction(child, result.meansTestApplied);
    assertCited(child);
    assertSane(child);

    // [R4] A former foster carer must never be shown a figure below their
    // previous fostering allowance within 24 months of the order.
    if (insideReg7Window && previous !== undefined && child.estimatedAllowanceWeekly < previous) {
      throw new GuardrailViolation('R4', 'Below the reg 7 former foster carer floor');
    }
  }

  assertChildBenefitDeductionIsLoud(input, result);
}

/** [R5] Scotland must never be routed through the SGO engine, in either direction. */
function assertScotlandIsSeparate(input: CalculatorInput, result: CalculatorResult): void {
  if (input.carer.nation === 'scotland' && result.regime !== 'scotland-kinship') {
    throw new GuardrailViolation('R5', 'Scotland routed through the SGO engine');
  }
  if (result.regime !== 'scotland-kinship') return;

  if (input.carer.nation !== 'scotland') {
    throw new GuardrailViolation('R5', 'Non-Scottish input routed to the Scottish kinship regime');
  }
  for (const child of result.perChild) {
    if (child.citations.some((c) => ENGLISH_CITATION_IDS.includes(c.id))) {
      throw new GuardrailViolation('R5', 'English citation attached to a Scottish result');
    }
  }
  for (const flag of result.flags) {
    if (flag.citation && ENGLISH_CITATION_IDS.includes(flag.citation.id)) {
      throw new GuardrailViolation('R5', 'English citation attached to a Scottish result flag');
    }
  }
}

/** [R1] Never output a fixed percentage of the fostering rate as "the answer". */
function assertNotAFixedFraction(child: PerChildResult, meansTestApplied: boolean): void {
  if (meansTestApplied || child.maximumWeekly <= 0) return;
  const ratio = child.estimatedAllowanceWeekly / child.maximumWeekly;
  if (SUSPICIOUS_RATIOS.some((r) => Math.abs(ratio - r) < RATIO_TOLERANCE)) {
    throw new GuardrailViolation('R1', `Fixed-fraction output (${ratio}) without a means test`);
  }
}

/** [R3] Every numeric output carries the citation it derives from. */
function assertCited(child: PerChildResult): void {
  if (child.citations.length === 0) {
    throw new GuardrailViolation('R3', `Uncited figure for child ${child.childId}`);
  }
}

function assertSane(child: PerChildResult): void {
  if (child.estimatedAllowanceWeekly < 0) {
    throw new GuardrailViolation('SANITY', 'Negative allowance');
  }
  // Only a floor can lift an estimate above the ceiling. Anything else means
  // the arithmetic went the wrong way.
  if (child.estimatedAllowanceWeekly > child.maximumWeekly && child.floorApplied === null) {
    throw new GuardrailViolation('SANITY', 'Estimate exceeds maximum with no floor applied');
  }
}

/** [R2] A Child Benefit deduction must never be silent. */
function assertChildBenefitDeductionIsLoud(
  input: CalculatorInput,
  result: CalculatorResult,
): void {
  const deducted = result.perChild.some((c) => c.childBenefitDeductionWeekly > 0);
  if (!deducted) return;

  if (!input.applyChildBenefitDeduction) {
    throw new GuardrailViolation('R2', 'Child Benefit deducted without explicit opt-in');
  }
  if (
    input.carer.onMeansTestedBenefits &&
    !result.flags.some((f) => f.code === 'UNLAWFUL_CB_DEDUCTION_RISK')
  ) {
    throw new GuardrailViolation(
      'R2',
      'CB deducted from a means-tested claimant without a critical flag',
    );
  }
}
