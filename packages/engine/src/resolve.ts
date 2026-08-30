/**
 * Shared input resolution.
 *
 * Lives apart from engine.ts so that guardrails.ts can resolve a carer's
 * position on exactly the same basis the engine used. When the two disagree —
 * for example the engine preferring `orderDate` while a guardrail read
 * `monthsSinceOrderMade` — a correct result throws a spurious violation, which
 * the UI turns into "we can't estimate this". Same helper, both sides.
 */

import { ageAt, monthsBetween } from './dates.js';
import type { CarerInput, ChildInput, IsoDate } from './types.js';

/** Age of a child at a date: from date of birth where given, else the stated age. */
export function ageOf(child: ChildInput, asAt: IsoDate): number {
  if (child.dateOfBirth) return ageAt(child.dateOfBirth, asAt);
  return child.ageYears;
}

/** Months since the order: from the order date where given, else the stated count. */
export function monthsSinceOrder(carer: CarerInput, asAt: IsoDate): number {
  if (carer.orderDate) return Math.max(0, monthsBetween(carer.orderDate, asAt));
  return carer.monthsSinceOrderMade;
}

/** The reg 7 protection window is the first 24 months after the order. */
export const REG7_WINDOW_MONTHS = 24;

export function withinReg7Window(carer: CarerInput, asAt: IsoDate): boolean {
  return carer.wasFosterCarerForThisChild && monthsSinceOrder(carer, asAt) < REG7_WINDOW_MONTHS;
}
