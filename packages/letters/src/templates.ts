/**
 * The nine letters, spec §18.
 *
 * This file is prose, not logic. It is kept apart from the module's code so a
 * change to how letters are generated cannot touch a word of what they say, and
 * so a solicitor reviewing the wording has one file to read.
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
 *
 * Gate 18 in scripts/gates/claims.ts reads this file and fails the build on a
 * letter that cites nothing.
 */

import { formatMoney, type EnglandRegion } from '@sgo/engine';
import type { LetterContext, LetterTemplate, TemplateSpec } from './types.js';

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

/**
 * What the carer was paid before the order, if they told me.
 *
 * Only in the three letters where the old fostering rate is part of the
 * argument: challenging a fixed percentage, asking which element was reduced,
 * and asking for the reward element to continue. It used to appear in eight of
 * the nine, including the complaint, where it sat between the complaint itself
 * and the list of what happened and did no work at all.
 *
 * Stated as the past fact it is. This figure is their FOSTERING allowance from
 * before the order, so writing "I currently receive" put a false sentence in
 * every letter: a former foster carer may be receiving nothing now, and the
 * council knows what it pays them.
 */
const paidLine = (ctx: LetterContext): string =>
  ctx.previousFosteringWeekly === undefined
    ? ''
    : `Before the order was made I was paid ${formatMoney(ctx.previousFosteringWeekly)} a week in total as a foster carer.\n\n`;

/**
 * The order date as a person would write it.
 *
 * The date arrives as an ISO string because that is what the engine works in,
 * and it was going straight into the letter: "the order was made on
 * 2025-01-15". In a letter from a grandmother to her council that reads like a
 * database record, which is the opposite of the impression the letter is
 * trying to make.
 */
const onOrderDate = (ctx: LetterContext): string => {
  if (!ctx.orderDate) return '';
  const d = new Date(`${ctx.orderDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return ` on ${ctx.orderDate}`;
  return ` on ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const LETTER_TEMPLATES: Record<LetterTemplate, TemplateSpec> = {
  'challenge-child-benefit-deduction': {
    title: 'Ask about Child Benefit being taken off your allowance',
    subject: () => `Special guardianship allowance. Child Benefit deduction, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I am the special guardian for ${PLACEHOLDER_CHILD}. ` +
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
      onOrderDate(ctx) +
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
      onOrderDate(ctx) +
      `. ${paidLine(ctx)}` +
      // Regulation 7 is a power, not an entitlement. Opening with "is protected"
      // hands the council an easy correction and weakens everything after it.
      // Two things the earlier draft got wrong, both from the review of
      // 2 September. Regulation 7 only applies at all where the decision to
      // include remuneration was taken BEFORE the order, so that is a threshold
      // question and it comes first. And the continuation test is exceptional
      // needs or other exceptional circumstances, not "the needs have not
      // reduced", which is a request that fails on its own terms.
      'I understand that your council can continue paying the reward element of my former fostering allowance for two years after the order, and beyond that where it considers continuation necessary because of the exceptional needs of the child or other exceptional circumstances.\n\n' +
      'I would be grateful if you could confirm:\n\n' +
      '1. whether the decision to include an element of remuneration in my financial support was taken before the special guardianship order was made;\n' +
      '2. the date on which the two-year period ends;\n' +
      '3. how I should ask for the reward element to continue beyond it; and\n' +
      '4. what you would consider to be exceptional needs or exceptional circumstances in a case like mine.\n\n' +
      `I would like to set out the particular needs and circumstances in ${PLACEHOLDER_CHILD}'s case. Please let me know what information would help you decide.\n\n` +
      signOff(),
    citationIds: ['sg-regs-2005-reg7', 'tower-hamlets-2013'],
    suggestedBy: ['REG7_EXPIRING', 'REG7_EXTENSION_AVAILABLE', 'REG7_FLOOR_APPLIED'],
  },

  'request-enhancement-disability': {
    title: "Ask for more because of your child's needs",
    subject: () => `Special guardianship allowance, request for an enhancement, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I am the special guardian for ${PLACEHOLDER_CHILD}. ` +
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
    obtains: "your council's written policy",
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
    obtains: 'the arithmetic behind your figure',
    subject: () => `Special guardianship allowance, request for a breakdown, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I am the special guardian for ${PLACEHOLDER_CHILD}. ` +
      // Always "my allowance". The only figure the letter can quote is the old
      // fostering allowance, and the breakdown being asked for is of the
      // CURRENT allowance, so "that figure" pointed at the wrong number.
      'I would be grateful for a written breakdown of how my allowance was calculated, showing:\n\n' +
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
      `I am the special guardian for ${PLACEHOLDER_CHILD}. ` +
      // The duty is triggered by receipt of the annual statement, not by twelve
      // months passing. A carer who has never been asked for one is not late for
      // a review: the council has not set up the thing that produces it.
      'I understand that my financial support should be reviewed when you receive my annual statement of circumstances, and that the national minimum allowance rates changed in April.\n\n' +
      'Please could you confirm:\n\n' +
      '1. whether you have asked me for an annual statement of my circumstances, and if not, whether you would like one now;\n' +
      '2. when my financial support was last reviewed; and\n' +
      '3. what information you need from me so that a review can take place.\n\n' +
      signOff(),
    citationIds: ['sg-regs-2005-reg18', 'sg-regs-2005-reg10'],
    suggestedBy: ['ANNUAL_REVIEW_DUE', 'RATES_STALE'],
  },

  'formal-complaint-stage-1': {
    title: 'Make a stage 1 complaint',
    subject: () => `Stage 1 complaint, special guardianship allowance, ref ${PLACEHOLDER_REF}`,
    body: (ctx) =>
      `${to(ctx)}\n\n` +
      `I would like to make a stage 1 complaint about the way my special guardianship allowance for ${PLACEHOLDER_CHILD} has been handled. ` +
      'What happened:\n\n' +
      '  • [what you asked for, and when]\n' +
      '  • [what the council did or did not do]\n' +
      '  • [what effect it has had on you and your child]\n\n' +
      'What I would like to happen:\n\n' +
      '  • [e.g. a written explanation of how the figure was calculated]\n' +
      '  • [e.g. a reassessment]\n\n' +
      // A bracket inside a bracket, with an instruction to the reader buried in a
      // sentence addressed to the council. The sentence to send and the note
      // about whether to send it are now separate lines.
      'I raised this on [DATE] and have not had a full answer.\n' +
      '[Delete the line above if you have not raised it before.]\n\n' +
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
    // ONE exception, from the review of 2 September, for whoever builds the
    // letters screen. The Ombudsman normally expects a complaint within twelve
    // months of the carer becoming aware of the problem. Where a carer says the
    // problem has been running close to or beyond that, the gate could cost them
    // the complaint altogether, which is the one case where slowing someone down
    // does real harm. Surface the time limit and let them through, with a note
    // that they can complain now and supply the documents afterwards. A narrow
    // exception to a good rule, not a loosening of it.
    gateExceptionNearTimeLimit: true,
  },
};
