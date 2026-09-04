/**
 * @sgo/letters, spec §18.
 *
 * Template letters, pre-filled with the carer's own figures. The wording lives
 * in templates.ts; this file is only the code that picks one, fills it in and
 * turns it into text.
 */

import { cite } from '@sgo/engine';
import type { FlagCode } from '@sgo/engine';
import { LETTER_TEMPLATES } from './templates.js';
import type { GeneratedLetter, LetterContext, LetterTemplate } from './types.js';

export { LETTER_TEMPLATES };
export type { GeneratedLetter, LetterContext, LetterTemplate, TemplateSpec } from './types.js';

/**
 * The order letters are offered in, most useful first.
 *
 * It follows the flag catalogue's own severity order in the engine: the Child
 * Benefit deduction first, then the policy challenges, then the requests, then
 * the complaint.
 */
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

export function generateLetter(template: LetterTemplate, ctx: LetterContext): GeneratedLetter {
  const spec = LETTER_TEMPLATES[template];
  return {
    template,
    subject: spec.subject(ctx),
    body: spec.body(ctx),
    citations: spec.citationIds.map(cite),
  };
}

/**
 * Which letters to offer, given the flags that fired (spec §18).
 *
 * Letters whose trigger fired come first, then the rest, each group in priority
 * order. A letter with prerequisites is never promoted, whatever fired: it sits
 * at the end until the carer says they have already asked the questions it
 * assumes they asked.
 */
export function suggestLetters(flagsRaised: FlagCode[]): LetterTemplate[] {
  const raised = new Set(flagsRaised);
  const templates = Object.keys(LETTER_TEMPLATES) as LetterTemplate[];

  const byPriority = (a: LetterTemplate, b: LetterTemplate): number =>
    PRIORITY.indexOf(a) - PRIORITY.indexOf(b);
  const triggered = (t: LetterTemplate): boolean =>
    LETTER_TEMPLATES[t].suggestedBy.some((f) => raised.has(f));
  const gated = (t: LetterTemplate): boolean =>
    (LETTER_TEMPLATES[t].requiresFirst ?? []).length > 0;

  const ordered = [
    ...templates.filter(triggered).sort(byPriority),
    ...templates.filter((t) => !triggered(t)).sort(byPriority),
  ];
  return [...ordered.filter((t) => !gated(t)), ...ordered.filter(gated)];
}

/**
 * What a carer must already HOLD before this letter is worth sending. Empty for
 * every letter but the formal complaint.
 *
 * Noun phrases, not titles. The titles are imperatives, so the sentence that
 * uses this read "a complaint made before you hold ask for your council's
 * written policy and ask for the arithmetic behind your figure". The title is
 * kept as the fallback, so a letter added to a requiresFirst list without an
 * `obtains` still reads as something rather than nothing.
 */
export function lettersRequiredFirst(t: LetterTemplate): string[] {
  return (LETTER_TEMPLATES[t].requiresFirst ?? []).map(
    (r) => LETTER_TEMPLATES[r].obtains ?? LETTER_TEMPLATES[r].title,
  );
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
