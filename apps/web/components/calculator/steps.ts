/**
 * The steps, and which one owns each thing that can go wrong.
 *
 * Spec §20: six steps, progressive. The rule that shapes the order is that the
 * maximum is shown after step 2, before any finances are asked for. It is the
 * figure most people came for, and it must never be gated behind a means test
 * they may not want to complete.
 */

import { MAX_CHILDREN } from './formState';

export type StepId = 'where' | 'children' | 'result' | 'history' | 'benefits' | 'finances' | 'council';

export const STEP_ORDER: StepId[] = [
  'where',
  'children',
  'result',
  'history',
  'benefits',
  'finances',
  'council',
];

export function isAfter(step: StepId, other: StepId): boolean {
  return STEP_ORDER.indexOf(step) > STEP_ORDER.indexOf(other);
}

/**
 * The step that owns each error, so a message can be shown once, beside the box
 * it belongs to.
 *
 * The summary at the top carries only what has nowhere else to go: an error
 * whose box is on a step the carer is not currently looking at. Anything else
 * would be said twice, once above the calculator and once beside the field.
 */
export function stepForPath(path: string): StepId | null {
  if (path === 'children' || path.startsWith('children.')) return 'children';
  if (path.startsWith('finances.')) return 'finances';
  if (path === 'carer.englandRegion' || path === 'carer.localAuthoritySlug') return 'where';
  if (path.startsWith('carer.')) return 'history';
  return null;
}

/**
 * [§24] The error summary links to the field that failed. A list of messages
 * with no way to reach the input is close to useless to a screen-reader or
 * keyboard user on a six-step form.
 *
 * Keys are the Zod issue paths from the shared schema. The repeated child
 * fields are enumerated to the schema's own limit, because stopping short
 * leaves an error on a later child linking nowhere.
 */
const perChildAnchors = (field: string): Record<string, string> =>
  Object.fromEntries(
    Array.from({ length: MAX_CHILDREN }, (_, i) => [`children.${i}.${field}`, `age-${i}`]),
  );

export const FIELD_ANCHORS: Record<string, string> = {
  'carer.englandRegion': 'council-select',
  'carer.previousWeeklyFosteringAllowance': 'months-since',
  'carer.orderDate': 'order-date',
  'carer.monthsSinceOrderMade': 'months-since',
  'finances.adultsInHousehold': 'adults',
  'finances.dependentChildrenInHousehold': 'household-children',
  children: 'age-0',
  ...perChildAnchors('ageYears'),
  ...perChildAnchors('isEldestInHousehold'),
};
