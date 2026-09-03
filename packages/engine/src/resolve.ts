/**
 * Working out where a carer stands, from whichever answer they gave.
 *
 * Two questions here have two possible answers each: a child's age can come
 * from a date of birth or from a stated age, and the time since the order can
 * come from a date or from a stated number of months. Both readings have to be
 * resolved the same way everywhere.
 *
 * This lives apart from the engine so guardrails.ts can resolve a carer's
 * position on exactly the same basis the engine used. When the two disagree,
 * for example the engine preferring orderDate while a guardrail reads
 * monthsSinceOrderMade, a correct result throws a spurious violation, which the
 * UI turns into "we can't estimate this". Same helper, both sides.
 */

import { ageAt, monthsBetween } from './dates.js';
import type { CarerInput, ChildInput, IsoDate } from './types.js';

/** Age of a child at a date: from date of birth where given, else the stated age. */
export function ageOf(child: ChildInput, asAt: IsoDate): number {
  return child.dateOfBirth ? ageAt(child.dateOfBirth, asAt) : child.ageYears;
}

/**
 * Months since the order, or undefined when the carer has not told us.
 *
 * The date wins where it was given. Undefined is not zero: everything that
 * depends on how long ago the order was made has to decide for itself what to
 * do when it does not know, rather than being handed a number that says today.
 */
export function monthsSinceOrder(carer: CarerInput, asAt: IsoDate): number | undefined {
  return carer.orderDate
    ? Math.max(0, monthsBetween(carer.orderDate, asAt))
    : carer.monthsSinceOrderMade;
}

/**
 * The regulation 7 window is the 24 months after the order.
 *
 * A window, not a protection. Regulation 7 lets a council carry on paying the
 * reward element of a former foster carer's allowance, and lets it stop. Inside
 * the window the power exists; it was never a guarantee, and calling it one
 * told carers they held something they do not.
 */
export const REG7_WINDOW_MONTHS = 24;

export function withinReg7Window(carer: CarerInput, asAt: IsoDate): boolean {
  const months = monthsSinceOrder(carer, asAt);
  // Not knowing is not the same as being inside it. Claiming the window when
  // nobody said when the order was made would floor the figure on a power the
  // council may no longer have, and the number a carer takes to their council
  // has to be one we can stand behind.
  if (months === undefined) return false;
  return carer.wasFosterCarerForThisChild && months < REG7_WINDOW_MONTHS;
}
