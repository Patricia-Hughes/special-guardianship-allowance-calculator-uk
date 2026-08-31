/**
 * Flags catalogue, spec §17.
 *
 * Each flag is both an inline card and a link to its guidance page. These are
 * the reason people share the site: the flag is often worth more to a carer
 * than the number.
 *
 * Copy rules (spec §18, §2 R7): never assert that a council has broken the law.
 * State what the guidance and the decisions say, and what the carer can ask for.
 * Reading age target 12–14.
 */

import { formatMoney, type Pence } from './money.js';
import { cite } from './referenceData.js';
import type { Citation, Flag, FlagCode, FlagSeverity } from './types.js';

interface FlagSpec {
  severity: FlagSeverity;
  title: string;
  body: (ctx: FlagContext) => string;
  citationId?: string;
  actionUrl?: string;
}

/** Everything a flag body might need. All fields optional, flags are context-tolerant. */
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
}

/**
 * Ordering within a severity follows this array, which is roughly descending by
 * financial impact (spec §17).
 */
const FLAG_ORDER: FlagCode[] = [
  'UNLAWFUL_CB_DEDUCTION_RISK',
  'FIXED_PERCENTAGE_POLICY',
  'BELOW_NMA',
  'LGSCO_FINDING_AGAINST_LA',
  'LGSCO_FINDING_FORMER_POLICY',
  'RATES_STALE',
  'REG7_FLOOR_APPLIED',
  'REG7_EXPIRING',
  'REG7_EXTENSION_AVAILABLE',
  'REG7_MISAPPLICATION_WARNING',
  'NOT_LOOKED_AFTER_BEFORE_ORDER',
  'KINSHIP_ZONE_ELIGIBLE',
  'KINSHIP_ZONE_PILOT_CAVEAT',
  'ENHANCEMENT_AVAILABLE',
  'MEANS_TEST_MODEL_OUTDATED',
  'LA_LIVING_COSTS_VARIATION',
  'TAPER_METHOD_ASSUMED',
  'AGE_17_TRANSITION',
  'SCOTLAND_SRA_IS_A_FLOOR',
  'SCOTLAND_FOSTER_KINSHIP_PARITY',
  'SCOTLAND_NO_WORSE_OFF',
  'COUNCIL_POLICY_UNKNOWN',
  'LA_POLICY_UNDER_REVIEW',
  'LOOKED_AFTER_STATUS_UNKNOWN',
  'KINSHIP_ZONE_EXCLUDED_REG6',
  'KINSHIP_ZONE_COMPARISON',
  'CAPITAL_RULE_MAY_APPLY',
  'ANNUAL_REVIEW_DUE',
  'THREE_YEAR_RESPONSIBILITY',
  'BENEFIT_CAP_RISK',
  'TWO_CHILD_LIMIT_ABOLISHED',
  'GUARDIANS_ALLOWANCE_CHECK',
];

const SEVERITY_ORDER: Record<FlagSeverity, number> = { critical: 0, important: 1, info: 2 };

const money = (p?: Pence): string => (p === undefined ? 'the amount' : formatMoney(p));

export const FLAG_CATALOGUE: Record<FlagCode, FlagSpec> = {
  UNLAWFUL_CB_DEDUCTION_RISK: {
    severity: 'critical',
    title: 'Taking Child Benefit off your allowance may not be lawful in your case',
    body: () =>
      'You have told us you get a means-tested benefit **and** that your council takes Child Benefit off your allowance.\n\n' +
      'In 2024 the Local Government and Social Care Ombudsman found that taking Child Benefit off carers who are on means-tested benefits, as a blanket rule, was wrong. The council involved had to recalculate around 170 carers\' allowances and pay refunds.\n\n' +
      'Ask your council in writing to confirm whether it takes Child Benefit into account for carers on means-tested benefits, and to explain how it decided that in your case.',
    citationId: 'lgsco-devon-2024',
    actionUrl: '/guidance/child-benefit-deduction',
  },
  FIXED_PERCENTAGE_POLICY: {
    severity: 'critical',
    title: 'A fixed percentage of the fostering rate has been ruled unlawful',
    body: (c) =>
      `${c.councilName ? `${c.councilName}'s published policy` : 'This policy'} appears to set the allowance at a fixed share of the fostering rate.\n\n` +
      'The courts have repeatedly held that applying a flat percentage, two-thirds, or a third, or any other fixed fraction, is an unjustified departure from the guidance. The starting point is the core fostering allowance, and the council must consider your actual circumstances.\n\n' +
      'Ask for the written policy and for the reasons behind the figure you were given.',
    citationId: 'kirklees-2010',
    actionUrl: '/guidance/fixed-percentage-policies',
  },
  BELOW_NMA: {
    severity: 'critical',
    title: 'This rate is below the national minimum for fostering',
    body: (c) =>
      `The rate we hold for ${c.councilName ?? 'your council'} (${money(c.coreWeekly)} a week) is below the national minimum fostering allowance for ${c.ageBand ? `the ${c.ageBand} age band` : 'this age band'} in your area (${money(c.nationalWeekly)} a week).\n\n` +
      'The statutory guidance says the core fostering allowance is the starting point for a special guardianship allowance. A figure below it needs an explanation.\n\n' +
      'Ask the council to explain in writing how it arrived at the figure and how it compares with what it pays its foster carers.',
    citationId: 'dfe-guidance-2017-para65',
    actionUrl: '/guidance/what-your-council-must-consider',
  },
  LGSCO_FINDING_AGAINST_LA: {
    // Wording note: a finding about a policy a council has since changed is not
    // a finding about the council today. Where the data records that the policy
    // changed, or that a later complaint about the current practice was not
    // upheld, this flag must say so in the same breath. Devon is the live case.
    severity: 'critical',
    title: 'The Ombudsman has made a finding about this council',
    body: (c) =>
      `${c.policySummary ?? 'The Local Government and Social Care Ombudsman has published a decision about this council\'s special guardianship allowance practice.'}\n\n` +
      (c.policyChangedOn ? `The council changed its policy from ${c.policyChangedOn}.\n\n` : '') +
      (c.supersededSummary ? `${c.supersededSummary}\n\n` : '') +
      'A published decision about one carer does not automatically apply to you, but it is relevant background if you are asking the council to look at your case again.',
    actionUrl: '/guidance/complaining-to-the-ombudsman',
  },
  REG7_FLOOR_APPLIED: {
    severity: 'important',
    title: 'Your previous fostering allowance protects your figure for two years',
    body: (c) =>
      `You fostered this child before the order, and the order was made ${c.monthsSinceOrder !== undefined ? `${c.monthsSinceOrder} months` : 'less than two years'} ago.\n\n` +
      `For the first two years, the reward part of what you were paid as a foster carer is protected. We have held your figure at ${money(c.previousWeekly)} a week rather than showing you a lower one.\n\n` +
      'The Court of Appeal has held that family foster carers should not be worse off than unrelated foster carers.',
    citationId: 'sg-regs-2005-reg7',
    actionUrl: '/guidance/former-foster-carers',
  },
  REG7_EXPIRING: {
    severity: 'important',
    title: 'Your two-year protection ends soon',
    body: (c) =>
      `The order was made ${c.monthsSinceOrder !== undefined ? `${c.monthsSinceOrder} months` : 'more than 18 months'} ago. The two-year protection for the reward part of your former fostering allowance runs out at 24 months.\n\n` +
      'The council can agree to continue it where the child\'s needs justify it. Ask now, in writing, rather than after your payments drop.',
    citationId: 'sg-regs-2005-reg7',
    actionUrl: '/guidance/former-foster-carers',
  },
  REG7_EXTENSION_AVAILABLE: {
    severity: 'important',
    title: 'You can ask for the two-year protection to be extended',
    body: () =>
      'The two-year continuation of the reward element is not a hard stop. A council can agree to carry on paying it where the child\'s needs justify it.\n\n' +
      'Ask in writing, and set out what has changed or what has not.',
    citationId: 'sg-regs-2005-reg7',
    actionUrl: '/guidance/former-foster-carers',
  },
  REG7_MISAPPLICATION_WARNING: {
    severity: 'important',
    title: 'Check what your council is tapering',
    body: () =>
      'Regulation 7 protects the **reward** part of a former foster carer\'s allowance for two years. It does not authorise tapering the whole allowance.\n\n' +
      'The Ombudsman found in 2020 that reducing an entire allowance to 75% and then 50% misapplied that rule. If your payments are being stepped down, ask the council which element it is reducing and why.',
    citationId: 'lgsco-southend-2020',
    actionUrl: '/guidance/former-foster-carers',
  },
  NOT_LOOKED_AFTER_BEFORE_ORDER: {
    severity: 'important',
    title: 'Your assessment is discretionary, not automatic',
    body: () =>
      'Because the child was not in the council\'s care immediately before the order, the council does not have to assess you for financial support. But it can, and you can ask it to.\n\n' +
      'Put the request in writing and ask for the decision and its reasons in writing too.',
    citationId: 'sg-regs-2005-reg6',
    actionUrl: '/guidance/who-can-get-an-allowance',
  },
  LOOKED_AFTER_STATUS_UNKNOWN: {
    severity: 'info',
    title: 'Worth checking: was the child in care just before the order?',
    body: () =>
      'You told us you were not sure. It matters: if the child was in the council\'s care immediately before the order, the council **must** assess you for financial support. If not, it may still assess you but does not have to.\n\n' +
      'Your social worker or the court paperwork will say.',
    citationId: 'sg-regs-2005-reg6',
    actionUrl: '/guidance/who-can-get-an-allowance',
  },
  KINSHIP_ZONE_ELIGIBLE: {
    severity: 'important',
    title: 'Your council is in the Kinship Zones pilot',
    body: (c) =>
      `${c.councilName ?? 'Your council'} is one of seven councils in the Kinship Zones pilot. In the pilot, eligible carers get an allowance equal to the full fostering National Minimum Allowance, and it is **not** means tested.\n\n` +
      'Ask your council whether you qualify, and ask for the answer in writing.',
    citationId: 'kinship-zones-2026',
    actionUrl: '/guidance/kinship-zones',
  },
  KINSHIP_ZONE_PILOT_CAVEAT: {
    severity: 'important',
    title: 'The pilot is time-limited and has conditions',
    body: () =>
      'Kinship Zones runs from April 2026 to 2029 in seven councils only. It does not change the law anywhere else.\n\n' +
      'You cannot get the pilot allowance and regulation 6 financial support for the same child at the same time. The scheme may change when it is evaluated.',
    citationId: 'kinship-zones-2026',
    actionUrl: '/guidance/kinship-zones',
  },
  KINSHIP_ZONE_EXCLUDED_REG6: {
    severity: 'info',
    title: 'You are in a pilot area but already on regulation 6 support',
    body: (c) =>
      'Your council is in the Kinship Zones pilot, but the pilot excludes carers already receiving regulation 6 financial support, so we have used the normal rules for your estimate.\n\n' +
      (c.kinshipZoneWeekly !== undefined
        ? `For comparison, the pilot rate for your child's age band would be ${money(c.kinshipZoneWeekly)} a week with no means test.\n\n`
        : '') +
      'That comparison is worth raising with your council if your current support is lower.',
    citationId: 'kinship-zones-2026',
    actionUrl: '/guidance/kinship-zones',
  },
  KINSHIP_ZONE_COMPARISON: {
    severity: 'info',
    title: 'What the pilot rate would be',
    body: (c) =>
      `The Kinship Zones pilot rate for your child's age band is ${money(c.kinshipZoneWeekly)} a week, not means tested.`,
    citationId: 'kinship-zones-2026',
    actionUrl: '/guidance/kinship-zones',
  },
  ENHANCEMENT_AVAILABLE: {
    severity: 'important',
    title: 'You can ask for more because of your child\'s needs',
    body: () =>
      'You told us your child has a disability or additional needs. The regulations let a council pay more than the core allowance to meet the consequences of a disability, or of abuse or neglect the child suffered.\n\n' +
      'There is **no national figure** for this and we have not added one to your estimate. It is decided council by council, on the child\'s needs. Ask for it, and give specifics: therapy, travel, respite, equipment, extra wear and tear.',
    citationId: 'sg-regs-2005-reg6',
    actionUrl: '/guidance/enhancements-for-additional-needs',
  },
  MEANS_TEST_MODEL_OUTDATED: {
    severity: 'important',
    title: 'The means test model is not law, and it pre-dates Universal Credit',
    body: () =>
      'Most English councils use a standard Department for Education spreadsheet model to work out how much of your income to take into account. That model is **not statutory**. No law requires it, and it was written before Universal Credit existed.\n\n' +
      'Your council may use a different method, and it is entitled to. Treat the figure below as an illustration of how the common model works, not as the answer your council will reach.',
    citationId: 'corambaaf-pn75',
    actionUrl: '/guidance/how-the-means-test-works',
  },
  TAPER_METHOD_ASSUMED: {
    severity: 'important',
    title: 'We had to assume how your council reduces the allowance',
    body: (c) =>
      `There is **no published national rule** for how much of your spare income a council takes off the allowance. Policies vary.\n\n` +
      `We have assumed ${c.taperMethod === 'pound-for-pound' ? 'pound-for-pound, which is the most common approach' : `the "${c.taperMethod}" method`}. Your council may use another. Ask it which it uses.`,
    actionUrl: '/guidance/how-the-means-test-works',
  },
  APRIL_RATE_BOUNDARY: {
    severity: 'info',
    title: 'You are in the few days of April where the rules disagree',
    body: () =>
      'The government sets these rates for a **tax year running 6 April to 5 April**. Most councils put their increase in from **1 April**.\n\n' +
      'Between 1 and 5 April the two do not line up. We have shown you the new rate, because that is what councils normally pay from 1 April. But if your council follows the tax year, it may still be paying last year\'s rate for a few more days.\n\n' +
      'It is worth a few pounds, not a few hundred. If you are checking a backdated claim, it is worth getting right.',
    actionUrl: '/guidance/rates',
  },
  WALES_BAND_ORDER_ANOMALY: {
    severity: 'info',
    title: 'In Wales, under-5s get more than 5 to 15 year olds',
    body: () =>
      'The Welsh rates pay **more for a child under 5 than for a child aged 5 to 15**. Everywhere else in the UK the rate rises with age, so this looks like a mistake.\n\n' +
      'It is not a mistake on this site. That is how the rates are published, and the same pattern appears in the previous year too.\n\n' +
      'We have not been able to check this against the Welsh Government\'s own circular, only against reports of it, so we are telling you rather than quietly correcting it.',
    actionUrl: '/guidance/rates',
  },
  CAPITAL_RULE_MAY_APPLY: {
    severity: 'info',
    title: 'Your council may have a savings rule',
    body: (c) =>
      `You told us about savings of ${money(c.savingsCapital)}. Some councils count savings above a threshold. A common pattern is £6,000, then £1 a week for each £250 above it. But there is no national rule and we do not hold your council's.\n\n` +
      'We have not applied any savings rule to your estimate. Ask your council whether it has one.',
    actionUrl: '/guidance/how-the-means-test-works',
  },
  ANNUAL_REVIEW_DUE: {
    severity: 'info',
    title: 'Your allowance should be reviewed every year',
    body: () =>
      'Financial support is reviewed annually. The council should ask you for updated information, tell you what it proposes, and give you a chance to comment before it changes anything.\n\n' +
      'If you have not had a review in over a year, ask for one. Rates go up every April.',
    citationId: 'sg-regs-2005-reg10-11',
    actionUrl: '/guidance/annual-reviews',
  },
  THREE_YEAR_RESPONSIBILITY: {
    severity: 'info',
    title: 'Which council is responsible',
    body: () =>
      'For three years after the order, the council that looked after the child stays responsible for assessing support needs, even if you have moved away. After three years, responsibility usually passes to the council where you live.\n\n' +
      'If you have moved recently, it is worth being clear which council you should be asking.',
    citationId: 'sg-regs-2005-reg5',
    actionUrl: '/guidance/which-council-is-responsible',
  },
  AGE_17_TRANSITION: {
    severity: 'important',
    title: 'Plan now for what happens at 18',
    body: () =>
      'Your child is 17. Special guardianship financial support normally stops when they turn 18, unless they stay in full-time education or training, in which case it can continue.\n\n' +
      'Ask your council now, in writing, what will happen on their eighteenth birthday and what you need to do to keep support going.',
    citationId: 'sg-regs-2005-reg9',
    actionUrl: '/guidance/turning-18',
  },
  BENEFIT_CAP_RISK: {
    severity: 'info',
    title: 'Check whether the benefit cap affects you',
    body: () =>
      'Households getting a lot of benefit income can hit the benefit cap. Special guardianship allowance itself is not counted as your income for your own means-tested benefits, and Guardian\'s Allowance is exempt from the cap.\n\n' +
      'If your benefits have been reduced without explanation, this is worth checking with an adviser.',
    actionUrl: '/guidance/benefits-and-your-allowance',
  },
  TWO_CHILD_LIMIT_ABOLISHED: {
    severity: 'info',
    title: 'The two-child limit no longer applies',
    body: () =>
      'The two-child limit in Universal Credit was removed from April 2026. If you are caring for three or more children and your Universal Credit has not changed, check your award.',
    citationId: 'uc-two-child-limit-act-2026',
    actionUrl: '/guidance/benefits-and-your-allowance',
  },
  GUARDIANS_ALLOWANCE_CHECK: {
    severity: 'info',
    title: 'Check whether you can claim Guardian\'s Allowance',
    body: () =>
      'Guardian\'s Allowance is a weekly payment for someone bringing up a child whose parents have died, or where one has died and the other cannot be traced, is serving a long prison sentence, or cannot be found.\n\n' +
      'It is tax free, it is ignored for means-tested benefits, and it is exempt from the benefit cap. It is widely missed.',
    actionUrl: '/guidance/benefits-and-your-allowance',
  },
  RATES_STALE: {
    severity: 'critical',
    title: 'These rates may be out of date',
    body: (c) =>
      `The rate table we are using ran to ${c.effectiveTo ?? 'a date that has now passed'}. New rates take effect on 1 April each year and we have not yet published them.\n\n` +
      'Treat the figures below as last year\'s. Check the current national minimum allowance before you use them in a letter.',
    actionUrl: '/guidance/rates',
  },
  COUNCIL_POLICY_UNKNOWN: {
    severity: 'info',
    title: 'We do not hold your council\'s published policy',
    body: (c) =>
      `We do not yet hold a sourced, dated copy of ${c.councilName ?? 'your council'}'s special guardianship financial support policy, so your estimate uses the national minimum figures for your area.\n\n` +
      'Councils must have a published policy. Asking for it in writing is a good first step, and it is the document any later challenge rests on.',
    actionUrl: '/guidance/asking-for-the-policy',
  },
  SCOTLAND_SRA_IS_A_FLOOR: {
    severity: 'important',
    title: 'The Scottish Recommended Allowance is a minimum, not a maximum',
    body: () =>
      'The Scottish Recommended Allowance is the floor. Your council can pay more, and some do.\n\n' +
      'If you are being offered less than the recommended allowance, ask why in writing.',
    citationId: 'sra-2026-27',
    actionUrl: '/guidance/scotland-kinship-care',
  },
  SCOTLAND_FOSTER_KINSHIP_PARITY: {
    severity: 'important',
    title: 'Kinship carers and foster carers get the same recommended rate',
    body: () =>
      'Scotland sets one recommended allowance for foster carers and kinship carers alike. If your council pays its foster carers more than it pays you for a child of the same age, ask it to explain the difference.',
    citationId: 'sra-2026-27',
    actionUrl: '/guidance/scotland-kinship-care',
  },
  LGSCO_FINDING_FORMER_POLICY: {
    // Same facts as LGSCO_FINDING_AGAINST_LA, different present tense. A council
    // that changed the policy it was criticised for is not a council currently
    // at fault, so this is not a "check these first" item and does not carry
    // that heading's alarm. It still matters: the remedy in these cases is
    // usually backdating, which can reach an order made years ago.
    severity: 'important',
    title: 'The Ombudsman made a finding about a policy this council has since changed',
    body: (c) =>
      `${c.policySummary ?? 'The Local Government and Social Care Ombudsman published a decision about how this council used to calculate special guardianship allowances.'}\n\n` +
      (c.policyChangedOn ? `The council changed that policy from ${c.policyChangedOn}.\n\n` : '') +
      (c.supersededSummary ? `${c.supersededSummary}\n\n` : '') +
      'This is history rather than a live problem, but it is worth knowing. Where a council has been found at fault, the Ombudsman has often asked it to go back and recalculate old awards, so it can still be relevant to an order made some years ago.',
    actionUrl: '/guidance/complaining-to-the-ombudsman',
  },
  LA_LIVING_COSTS_VARIATION: {
    severity: 'important',
    title: 'Your council allows a different amount for basic living costs',
    body: (c) =>
      `The standardised model most councils use allows basic living costs at ${c.modelLivingCostsPercent ?? 125}% of the Income Support rate for a household your size. ` +
      `${c.councilName ?? 'Your council'} publishes ${c.livingCostsPercent ?? 100}%, and that is the figure used above.\n\n` +
      'Allowing less for living costs leaves more income counted as spare, which means a larger contribution expected from you and a smaller allowance. It is a local choice, not a national rule.\n\n' +
      'If the figure matters to you, ask the council to confirm the percentage it applied and why.',
    actionUrl: '/guidance/how-the-means-test-works',
  },
  LA_POLICY_UNDER_REVIEW: {
    severity: 'info',
    title: 'This council is rewriting its policy',
    body: (c) =>
      (c.policyUnderReviewNote ??
        `${c.councilName ?? 'This council'} says its special guardianship financial support policy is under review, so what is shown here is the last version it published.`) +
      '\n\nAsk the council for its current position in writing before you rely on any figure here.',
    actionUrl: '/guidance/asking-for-the-policy',
  },
  SCOTLAND_NO_WORSE_OFF: {
    severity: 'info',
    title: 'No family should be worse off',
    body: () =>
      'Where you already have an arrangement that pays more than the recommended allowance, the higher amount applies. Moving to the recommended rate should not reduce what you get.',
    citationId: 'sra-2026-27',
    actionUrl: '/guidance/scotland-kinship-care',
  },
};

export function makeFlag(code: FlagCode, ctx: FlagContext = {}): Flag {
  const spec = FLAG_CATALOGUE[code];
  let citation: Citation | undefined;
  if (spec.citationId) citation = cite(spec.citationId);
  const flag: Flag = {
    code,
    severity: spec.severity,
    title: spec.title,
    body: spec.body(ctx),
  };
  if (citation) flag.citation = citation;
  if (spec.actionUrl) flag.actionUrl = spec.actionUrl;
  return flag;
}

/** Sort critical → important → info, then by the catalogue's own order (spec §17). */
export function sortFlags(flags: Flag[]): Flag[] {
  return [...flags].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    return FLAG_ORDER.indexOf(a.code) - FLAG_ORDER.indexOf(b.code);
  });
}

/** Drop duplicates by code, keeping the first occurrence. */
export function dedupeFlags(flags: Flag[]): Flag[] {
  const seen = new Set<FlagCode>();
  const out: Flag[] = [];
  for (const f of flags) {
    if (seen.has(f.code)) continue;
    seen.add(f.code);
    out.push(f);
  }
  return out;
}
