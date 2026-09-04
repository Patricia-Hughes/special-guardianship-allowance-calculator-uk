/**
 * The shape of a letter and what it needs to fill itself in.
 */

import type { Citation, EnglandRegion, FlagCode, IsoDate, Pence } from '@sgo/engine';

export type LetterTemplate =
  | 'request-written-policy'
  | 'request-calculation-breakdown'
  | 'challenge-child-benefit-deduction'
  | 'challenge-fixed-percentage'
  | 'ask-which-element-reduced'
  | 'request-reg7-extension'
  | 'request-annual-review'
  | 'request-enhancement-disability'
  | 'formal-complaint-stage-1';

/**
 * The carer's own figures. A letter is a product feature rather than a
 * copy-paste block precisely because it already contains these: the region, the
 * age band, and the national minimum for their child.
 */
export interface LetterContext {
  councilName?: string;
  childAgeBand: string;
  region: EnglandRegion;
  nmaWeekly: Pence;
  /**
   * What the carer was paid as a foster carer BEFORE the order, per week, for
   * every child they were fostering. Not what they receive now: a former foster
   * carer may be receiving nothing. The letters used to render this as "I
   * currently receive X a week", which told the council something untrue and
   * handed them an easy correction.
   */
  previousFosteringWeekly?: Pence;
  onMeansTestedBenefits: boolean;
  wasFosterCarer: boolean;
  orderDate?: IsoDate;
  flagsRaised: FlagCode[];
}

export interface GeneratedLetter {
  template: LetterTemplate;
  subject: string;
  /** Plain text, ready to paste into an email or print. */
  body: string;
  citations: Citation[];
}

export interface TemplateSpec {
  title: string;
  subject: (ctx: LetterContext) => string;
  body: (ctx: LetterContext) => string;
  citationIds: string[];
  /** Offer this letter first when one of these flags fired. */
  suggestedBy: FlagCode[];
  /**
   * Letters that should have been sent, and answered badly or not at all,
   * before this one is worth sending.
   *
   * Only the formal complaint has any. A complaint made before the carer holds
   * the written policy and the calculation breakdown has no evidence attached,
   * is easy to answer with a general reassurance, and starts formal clocks the
   * carer then cannot restart. So it is never promoted by a flag: the UI asks
   * whether the earlier letters have been sent, and offers those instead if not.
   */
  requiresFirst?: LetterTemplate[];
  /**
   * What the carer ends up HOLDING once this letter is answered, as a noun
   * phrase, for the sentence that names the prerequisites.
   *
   * The titles are imperatives, so dropping them into "a complaint made before
   * you hold ..." produced "before you hold ask for your council's written
   * policy and ask for the arithmetic behind your figure". Only the letters
   * named in another letter's requiresFirst need one.
   */
  obtains?: string;
  /**
   * Let the carer past `requiresFirst` when they are near the Ombudsman's usual
   * twelve-month time limit.
   *
   * The gate exists so nobody complains without the documents that make a
   * complaint stick. But a carer whose problem has been running for close to a
   * year can lose the complaint entirely by waiting, and that is the one case
   * where the gate does more harm than good.
   */
  gateExceptionNearTimeLimit?: boolean;
}
