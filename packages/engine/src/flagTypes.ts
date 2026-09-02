/**
 * What a warning is, separately from what the warnings say.
 *
 * Kept apart from both so that flagCatalogue.ts can be read as prose and
 * flags.ts as code, and neither has to carry these declarations.
 */

import type { FlagSeverity, Pence } from './types.js';

export interface FlagSpec {
  severity: FlagSeverity;
  title: string;
  body: (ctx: FlagContext) => string;
  citationId?: string;
  actionUrl?: string;
}

/**
 * Everything a warning body might need.
 *
 * Every field is optional and every body must read sensibly without it. A
 * warning is raised from several places with different amounts of information,
 * and one that renders "undefined" at a carer is worse than one that stays
 * general.
 */
export interface FlagContext {
  councilName?: string;
  coreWeekly?: Pence;
  nationalWeekly?: Pence;
  ageBand?: string;
  previousWeekly?: Pence;
  monthsSinceOrder?: number;
  kinshipZoneWeekly?: Pence;
  taperMethod?: string;
  savingsCapital?: Pence;
  childCount?: number;
  policySummary?: string;
  policySourceUrl?: string;
  effectiveTo?: string;
  livingCostsPercent?: number;
  modelLivingCostsPercent?: number;
  policyChangedOn?: string;
  supersededSummary?: string;
  policyUnderReviewNote?: string;
  /** When we last read the council's published policy, so a claim can be dated. */
  policyCheckedOn?: string;
  /** The date of the Ombudsman decision, shown with the finding. */
  decisionDate?: string;
}
