/**
 * @sgo/letters, spec §18.
 *
 * Template letters, pre-filled with the user's own figures. They are a product
 * feature, not a copy-paste block: the useful version already contains the
 * carer's region, age band and the national minimum for their child.
 *
 * Copy rules, from the spec, and they matter more than the templating:
 *  - Polite, short, specific. These go to a social worker the carer has an
 *    ongoing relationship with. An aggressive letter damages that relationship
 *    and the child's placement.
 *  - Always request, never demand or threaten.
 *  - Cite the regulation or decision in one line, not a legal essay.
 *  - Never assert the council has broken the law. Assert what the guidance and
 *    the decisions say, and ask them to confirm their position.
 *  - Leave [YOUR NAME], [CHILD'S NAME], [REFERENCE] as visible placeholders.
 */

import { cite, formatMoney, type Citation, type EnglandRegion, type FlagCode, type IsoDate, type Pence } from '@sgo/engine';

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

export interface LetterContext {
  councilName?: string;
  childAgeBand: string;
  region: EnglandRegion;
  nmaWeekly: Pence;
  currentlyPaidWeekly?: Pence;
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

const REGION_LABEL: Record<EnglandRegion, string> = {
  london: 'London',
  'south-east': 'the South East',
  'rest-of-england': 'the rest of England',
};

const PLACEHOLDER_NAME = '[YOUR NAME]';
const PLACEHOLDER_CHILD = "[CHILD'S NAME]";
const PLACEHOLDER_REF = '[REFERENCE]';

const to = (ctx: LetterContext): string =>
  ctx.councilName ? `Dear ${ctx.councilName} Children's Services,` : 'Dear Children\'s Services,';

const signOff = (): string =>
  `Thank you for your help.\n\nYours sincerely,\n\n${PLACEHOLDER_NAME}\nSpecial guardian for ${PLACEHOLDER_CHILD}\nReference: ${PLACEHOLDER_REF}`;

const paidLine = (ctx: LetterContext): string =>
  ctx.currentlyPaidWeekly === undefined
    ? ''
    : `I currently receive ${formatMoney(ctx.currentlyPaidWeekly)} a week.\n\n`;

interface TemplateSpec {
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
}

export const LETTER_TEMPLATES: Record<LetterTemplate, TemplateSpec> = {
  'challenge-child-benefit-deduction': {
    title: 'Ask about Child Benefit being taken off your allowance',
    subject: () => `Special guardianship allowance. Child Benefit deduction, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I am the special guardian for ${PLACEHOLDER_CHILD}. ${paidLine(ctx)}` +
      'I understand that Child Benefit is being taken into account when my special guardianship allowance is worked out. I would be grateful if you could confirm in writing:\n\n' +
      '1. whether Child Benefit is deducted from my allowance, and if so how much;\n' +
      '2. whether your policy deducts Child Benefit from carers who receive means-tested benefits; and\n' +
      '3. how that was decided in my case.\n\n' +
      (ctx.onMeansTestedBenefits
        ? 'I receive means-tested benefits. In 2024 the Local Government and Social Care Ombudsman found that deducting Child Benefit as a blanket rule from carers in that position was not appropriate, and asked the council concerned to recalculate its awards. I would be grateful if you could confirm how your policy takes that decision into account.\n\n'
        : 'I would also be grateful if you could send me the part of your policy that covers this.\n\n') +
      // Concedes nothing the council would not say in its first reply, and moves
      // the exchange straight onto the ground the carer can actually win on.
      'I understand the regulations allow Child Benefit to be taken into account. I am asking how that was decided in my case, rather than whether it is permitted.\n\n' +
      signOff(),
    citationIds: ['lgsco-devon-2024', 'sg-regs-2005-reg13', 'sg-regs-2005-reg6'],
    suggestedBy: ['UNLAWFUL_CB_DEDUCTION_RISK'],
  },

  'challenge-fixed-percentage': {
    title: 'Ask how your allowance was calculated, where a percentage seems to have been used',
    subject: () => `Special guardianship allowance, how my allowance was calculated, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I am the special guardian for ${PLACEHOLDER_CHILD}. ${paidLine(ctx)}` +
      // Attributed, so the carer is quoting a published source rather than
      // asserting a number of ours. If our rate data or region mapping were ever
      // wrong, an unattributed figure would cost them credibility on their
      // strongest point.
      `My understanding is that the national minimum fostering allowance published by the Department for Education for a child in the ${ctx.childAgeBand} age band in ${REGION_LABEL[ctx.region]} is ${formatMoney(ctx.nmaWeekly)} a week, and that the statutory guidance treats the core fostering allowance as the starting point for a special guardianship allowance.\n\n` +
      'Please could you tell me:\n\n' +
      '1. what figure you used as the starting point for my allowance;\n' +
      '2. whether a fixed percentage or proportion was applied at any stage; and\n' +
      '3. what was taken into account about my circumstances and my child\'s needs.\n\n' +
      'I ask because the courts have said that applying a flat percentage of the fostering allowance, without considering the individual case, is a departure from the guidance that needs to be justified. I would like to understand how the figure in my case was reached.\n\n' +
      signOff(),
    citationIds: ['kirklees-2010', 'merton-2012', 'dfe-guidance-2017-para65'],
    suggestedBy: ['FIXED_PERCENTAGE_POLICY', 'BELOW_NMA'],
  },

  // Two letters, because one was doing two jobs badly. A carer whose whole
  // allowance is being stepped down was being handed the extension letter,
  // which never asks the tapering question and whose second question accepts
  // that the allowance will drop. That gave away the strongest argument they
  // had. See REG7_MISAPPLICATION_WARNING and the Southend decision.
  'ask-which-element-reduced': {
    title: 'Ask which part of your allowance is being reduced',
    subject: () => `Special guardianship allowance, how it is being reduced, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I am the special guardian for ${PLACEHOLDER_CHILD}, and I was ${PLACEHOLDER_CHILD}'s foster carer before the special guardianship order was made` +
      (ctx.orderDate ? ` on ${ctx.orderDate}` : '') +
      `. ${paidLine(ctx)}` +
      'My payments are being reduced, and I would like to understand exactly what is being reduced and why. Please could you confirm:\n\n' +
      '1. which element of my allowance is being reduced, and by how much;\n' +
      '2. the basis on which that reduction is being made; and\n' +
      '3. if regulation 7 is being relied on, how it is being applied in my case.\n\n' +
      'I ask because regulation 7 concerns the reward element of a former foster carer\'s allowance. The Ombudsman found in 2020 that reducing an entire allowance in stages misapplied that rule. I would like to understand which of these applies to my payments.\n\n' +
      signOff(),
    citationIds: ['sg-regs-2005-reg7', 'lgsco-southend-2020'],
    suggestedBy: ['REG7_MISAPPLICATION_WARNING'],
  },

  'request-reg7-extension': {
    title: 'Ask for the reward element to continue past two years',
    subject: () => `Special guardianship allowance, continuing the reward element, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I am the special guardian for ${PLACEHOLDER_CHILD}, and I was ${PLACEHOLDER_CHILD}'s foster carer before the special guardianship order was made` +
      (ctx.orderDate ? ` on ${ctx.orderDate}` : '') +
      `. ${paidLine(ctx)}` +
      // Regulation 7 is a power, not an entitlement. Opening with "is protected"
      // hands the council an easy correction and weakens everything after it.
      'I understand that your council can continue paying the reward element of my former fostering allowance for two years after the order, and for longer where it considers that appropriate.\n\n' +
      'I would be grateful if you could confirm:\n\n' +
      '1. the date on which that two-year period ends;\n' +
      '2. how I can ask for the reward element to continue beyond it, and what information would help you decide; and\n' +
      '3. how you would decide that.\n\n' +
      `${PLACEHOLDER_CHILD}'s needs have not reduced, and I would like to set out why continuing it would help. Please let me know what you need from me.\n\n` +
      signOff(),
    citationIds: ['sg-regs-2005-reg7', 'tower-hamlets-2013'],
    suggestedBy: ['REG7_EXPIRING', 'REG7_EXTENSION_AVAILABLE', 'REG7_FLOOR_APPLIED'],
  },

  'request-enhancement-disability': {
    title: "Ask for more because of your child's needs",
    subject: () => `Special guardianship allowance, request for an enhancement, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I am the special guardian for ${PLACEHOLDER_CHILD}. ${paidLine(ctx)}` +
      'The regulations allow financial support to take account of a child\'s disability or additional needs, including the consequences of any abuse or neglect they experienced before the order.\n\n' +
      `${PLACEHOLDER_CHILD} has additional needs which mean extra costs for our household. In particular:\n\n` +
      '  • [describe the need, e.g. travel to therapy appointments]\n' +
      '  • [describe the cost, e.g. £__ a month]\n' +
      '  • [add as many as apply]\n\n' +
      'I would be grateful if you could assess whether an enhancement to my allowance would be appropriate, and let me know what evidence would help.\n\n' +
      signOff(),
    citationIds: ['sg-regs-2005-reg6-2-b'],
    suggestedBy: ['ENHANCEMENT_AVAILABLE'],
  },

  'request-written-policy': {
    title: "Ask for your council's written policy",
    subject: () => `Request for your special guardianship financial support policy, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I am the special guardian for ${PLACEHOLDER_CHILD}.\n\n` +
      'Please could you send me a copy of your current policy on financial support for special guardians, including:\n\n' +
      '1. how the starting figure for an allowance is decided;\n' +
      '2. how any means test is applied, and what income is taken into account;\n' +
      '3. whether Child Benefit is taken into account; and\n' +
      '4. how allowances are reviewed each year.\n\n' +
      'A link to the published version is fine if it is on your website.\n\n' +
      signOff(),
    citationIds: ['sg-regs-2005-reg6', 'dfe-guidance-2017-para65'],
    suggestedBy: ['COUNCIL_POLICY_UNKNOWN'],
  },

  'request-calculation-breakdown': {
    title: 'Ask for the arithmetic behind your figure',
    subject: () => `Special guardianship allowance, request for a breakdown, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I am the special guardian for ${PLACEHOLDER_CHILD}. ${paidLine(ctx)}` +
      // "that figure" pointed at a sentence that only appears when the carer
      // told us what they are paid. Without it the letter asked about a figure
      // it had never mentioned.
      `I would be grateful for a written breakdown of how ${ctx.currentlyPaidWeekly === undefined ? 'my allowance' : 'that figure'} was calculated, showing:\n\n` +
      '1. the starting figure and where it came from;\n' +
      '2. what income was taken into account, and what was disregarded;\n' +
      '3. what outgoings were allowed; and\n' +
      '4. any deductions, and the reason for each.\n\n' +
      `For reference, the national minimum fostering allowance for the ${ctx.childAgeBand} age band in ${REGION_LABEL[ctx.region]} is ${formatMoney(ctx.nmaWeekly)} a week.\n\n` +
      signOff(),
    citationIds: ['sg-regs-2005-reg6', 'dfe-guidance-2017-para65'],
    suggestedBy: ['MEANS_TEST_MODEL_OUTDATED', 'TAPER_METHOD_ASSUMED'],
  },

  'request-annual-review': {
    title: 'Ask for your annual review',
    subject: () => `Special guardianship allowance, annual review, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I am the special guardian for ${PLACEHOLDER_CHILD}. ${paidLine(ctx)}` +
      'I understand that financial support should be reviewed each year. I do not think my allowance has been reviewed recently, and the national minimum allowance rates changed in April.\n\n' +
      'Please could you carry out a review, and let me know what information you need from me.\n\n' +
      signOff(),
    citationIds: ['sg-regs-2005-reg10-11'],
    suggestedBy: ['ANNUAL_REVIEW_DUE', 'RATES_STALE'],
  },

  'formal-complaint-stage-1': {
    title: 'Make a stage 1 complaint',
    subject: () => `Stage 1 complaint, special guardianship allowance, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I would like to make a stage 1 complaint about the way my special guardianship allowance for ${PLACEHOLDER_CHILD} has been handled. ${paidLine(ctx)}` +
      'What happened:\n\n' +
      '  • [what you asked for, and when]\n' +
      '  • [what the council did or did not do]\n' +
      '  • [what effect it has had on you and your child]\n\n' +
      'What I would like to happen:\n\n' +
      '  • [e.g. a written explanation of how the figure was calculated]\n' +
      '  • [e.g. a reassessment]\n\n' +
      '[I raised this on [DATE] and have not had a full answer. If you have not raised it before, delete this sentence.]\n\n' +
      'I am asking for it to be looked at under your complaints procedure. Please confirm you have received this and let me know when I can expect a reply.\n\n' +
      'If I am not satisfied with the outcome, I understand I can ask the Local Government and Social Care Ombudsman to look at it.\n\n' +
      signOff(),
    citationIds: ['sg-regs-2005-reg6'],
    // Deliberately empty. A published decision about a different carer is not a
    // reason for this carer to complain, and this site's own warning says so.
    // Promoting a formal complaint on the strength of it sent carers into the
    // process without the evidence to make it stick.
    suggestedBy: [],
    requiresFirst: ['request-written-policy', 'request-calculation-breakdown'],
  },
};

export function generateLetter(t: LetterTemplate, ctx: LetterContext): GeneratedLetter {
  const spec = LETTER_TEMPLATES[t];
  return {
    template: t,
    subject: spec.subject(ctx),
    body: spec.body(ctx),
    citations: spec.citationIds.map(cite),
  };
}

/**
 * Suggest which letters to offer, based on which flags fired. If
 * UNLAWFUL_CB_DEDUCTION_RISK fired, challenge-child-benefit-deduction goes at
 * the top (spec §18).
 */
export function suggestLetters(flagsRaised: FlagCode[]): LetterTemplate[] {
  const raised = new Set(flagsRaised);
  const matched: LetterTemplate[] = [];
  const rest: LetterTemplate[] = [];
  for (const [template, spec] of Object.entries(LETTER_TEMPLATES) as Array<[LetterTemplate, TemplateSpec]>) {
    if (spec.suggestedBy.some((f) => raised.has(f))) matched.push(template);
    else rest.push(template);
  }
  // Within the matched set, order by the flag severity implied by the catalogue
  // order in the engine: CB deduction first, then policy challenges.
  const PRIORITY: LetterTemplate[] = [
    'challenge-child-benefit-deduction',
    'challenge-fixed-percentage',
    'ask-which-element-reduced',
    'request-reg7-extension',
    'request-enhancement-disability',
    'request-calculation-breakdown',
    'request-written-policy',
    'request-annual-review',
    'formal-complaint-stage-1',
  ];
  const byPriority = (a: LetterTemplate, b: LetterTemplate): number =>
    PRIORITY.indexOf(a) - PRIORITY.indexOf(b);
  // A letter with prerequisites is never promoted, whatever fired. It sits at
  // the end of the list until the carer says they have already asked the
  // questions it assumes they asked.
  const gated = (t: LetterTemplate): boolean =>
    (LETTER_TEMPLATES[t].requiresFirst ?? []).length > 0;
  const ordered = [...matched.sort(byPriority), ...rest.sort(byPriority)];
  return [...ordered.filter((t) => !gated(t)), ...ordered.filter(gated)];
}

/**
 * What a carer must already have done before this letter is worth sending, as
 * the titles of the letters that come first. Empty for every letter but the
 * formal complaint.
 */
export function lettersRequiredFirst(t: LetterTemplate): string[] {
  return (LETTER_TEMPLATES[t].requiresFirst ?? []).map((r) => LETTER_TEMPLATES[r].title);
}

export function letterTitle(t: LetterTemplate): string {
  return LETTER_TEMPLATES[t].title;
}

/** A .txt download: subject line, then the body. No email client required. */
export function letterAsPlainText(letter: GeneratedLetter): string {
  const sources = letter.citations
    .map((c) => `  ${c.label}${c.url ? `\n    ${c.url}` : ''}`)
    .join('\n');
  return (
    `Subject: ${letter.subject}\n\n${letter.body}\n\n` +
    `---\nWho to send this to:\n` +
    '  For the first three years after the order, the council that looked after the child stays\n' +
    '  responsible, even if you have moved away. After that it is usually the council where you\n' +
    '  live. See /guidance/which-council-is-responsible if you are not sure.\n\n' +
    `What this letter refers to:\n${sources}\n\n` +
    'This letter was prepared using an online estimate. It is not legal advice.\n'
  );
}
