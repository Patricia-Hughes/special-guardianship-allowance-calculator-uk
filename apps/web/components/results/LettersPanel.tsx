'use client';

/**
 * The letters, spec §18.
 *
 * The point of the whole calculator is not the number. It is a carer who knows
 * what to ask and has the words to ask it, so this is where the sourcing work
 * pays off: every letter arrives already carrying this carer's council, region,
 * age band and figure.
 *
 * Deliberately small. It renders text, copies it, and downloads it. There is no
 * account, nothing is saved, and nothing is sent on the carer's behalf. The
 * carer sends their own letter from their own email, which is also the only way
 * the reply reaches them.
 */

import { useState } from 'react';
import {
  type CalculatorInput,
  type CalculatorResult,
  type EnglandRegion,
  type Pence,
} from '@sgo/engine';
import {
  generateLetter,
  letterAsPlainText,
  lettersRequiredFirst,
  suggestLetters,
  LETTER_TEMPLATES,
  type LetterContext,
  type LetterTemplate,
} from '@sgo/letters';
import { useCopyToClipboard } from '../ui/useCopyToClipboard';

/** Why this letter is being offered, in one line, from the warning that fired. */
const REASON: Partial<Record<LetterTemplate, string>> = {
  'challenge-child-benefit-deduction':
    'Your council takes Child Benefit off your allowance, and you are on means-tested benefits.',
  'challenge-fixed-percentage':
    'Your council appears to pay a fixed share of the fostering rate.',
  'ask-which-element-reduced': 'Your allowance is being stepped down.',
  'request-reg7-extension': 'You fostered this child before the order.',
  'request-enhancement-disability': 'You told me your child has a disability or additional needs.',
  'request-calculation-breakdown': 'You have not been shown how your figure was worked out.',
  'request-written-policy': 'Everything else rests on this document.',
  'request-annual-review': 'Your allowance may not have been reviewed recently.',
  'formal-complaint-stage-1':
    'Only once you have asked for the policy and the breakdown and been answered badly, or not at all.',
};

/**
 * The Ombudsman normally expects a complaint within twelve months of the carer
 * becoming aware of a problem. Past this many months, the gate on the formal
 * complaint does more harm than good, so it lifts and says why.
 */
const OMBUDSMAN_MONTHS = 12;

export function LettersPanel({
  result,
  input,
  councilName,
}: {
  result: CalculatorResult;
  input: CalculatorInput;
  councilName?: string;
}) {
  const ctx: LetterContext = {
    ...(councilName ? { councilName } : {}),
    childAgeBand: result.perChild[0]?.ageBand ?? '',
    region: (input.carer.englandRegion ?? 'rest-of-england') as EnglandRegion,
    nmaWeekly: (result.perChild[0]?.maximumWeekly ?? 0) as Pence,
    ...(input.carer.previousWeeklyFosteringAllowance !== undefined
      ? { previousFosteringWeekly: input.carer.previousWeeklyFosteringAllowance }
      : {}),
    onMeansTestedBenefits: input.carer.onMeansTestedBenefits,
    wasFosterCarer: input.carer.wasFosterCarerForThisChild,
    ...(input.carer.orderDate ? { orderDate: input.carer.orderDate } : {}),
    flagsRaised: result.flags.map((f) => f.code),
  };

  // Long-running problems are the one case where holding a carer back can cost
  // them the complaint altogether.
  // Only when we actually know. Lifting the gate on an unknown would push a
  // carer straight to a formal complaint with nothing attached to it.
  const nearTimeLimit =
    input.carer.monthsSinceOrderMade !== undefined &&
    input.carer.monthsSinceOrderMade >= OMBUDSMAN_MONTHS;
  const templates = suggestLetters(ctx.flagsRaised);

  return (
    <section className="section print-hide" aria-labelledby="letters-heading">
      <h2 id="letters-heading">Letters you can send</h2>
      <p className="lede">
        Each one is already filled in with your council, your area and your figure. Copy it, change
        anything you want, and send it from your own email.
      </p>
      <p className="muted small">
        Keep them short and polite. These go to a social worker you will be dealing with for years,
        and a letter that asks a clear question gets a better answer than one that accuses.
      </p>

      <ol className="letters">
        {templates.map((template) => (
          <li key={template}>
            <Letter
              template={template}
              ctx={ctx}
              nearTimeLimit={nearTimeLimit}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Letter({
  template,
  ctx,
  nearTimeLimit,
}: {
  template: LetterTemplate;
  ctx: LetterContext;
  nearTimeLimit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { state: copied, copy } = useCopyToClipboard();

  const spec = LETTER_TEMPLATES[template];
  const letter = generateLetter(template, ctx);
  const text = letterAsPlainText(letter);
  const prerequisites = lettersRequiredFirst(template);

  // The gate lifts near the Ombudsman's time limit, because waiting can cost
  // the carer the complaint entirely. It says so rather than silently opening.
  const gated = prerequisites.length > 0;
  const lifted = gated && Boolean(spec.gateExceptionNearTimeLimit) && nearTimeLimit;


  return (
    <div className="letter">
      <h3 className="letter__title">{spec.title}</h3>
      {REASON[template] && <p className="letter__why muted">{REASON[template]}</p>}

      {gated && !lifted && (
        <div className="callout callout--important" role="note" aria-label="Send these first">
          <p className="flush">
            <strong>Send these first.</strong> A complaint made before you hold {joinAnd(prerequisites)}{' '}
            has no documents attached, is easy to answer with a general reassurance, and starts a
            formal clock you cannot restart. Use it once you have asked and been answered badly, or
            not at all.
          </p>
        </div>
      )}

      {lifted && (
        <div className="callout callout--critical" role="note" aria-label="Time limit">
          <p className="flush">
            <strong>Do not wait for this one.</strong> The Ombudsman normally expects a complaint
            within 12 months of you becoming aware of a problem, and yours has been running longer
            than that. You can complain now and supply {joinAnd(prerequisites)} afterwards. Ask for
            them at the same time.
          </p>
        </div>
      )}

      <button
        type="button"
        className="btn btn--secondary"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Hide this letter' : 'Read this letter'}
      </button>

      {open && (
        <>
          <pre className="letter__body" tabIndex={0} aria-label={`${spec.title}, full text`}>
            {text}
          </pre>
          <div className="row gap-lg">
            <button type="button" className="btn" onClick={() => copy(text)}>
              Copy the whole letter
            </button>
            <DownloadLink template={template} text={text} />
          </div>
          <p aria-live="polite" className="share__status">
            {copied === 'done' && 'Letter copied. Paste it into an email.'}
            {copied === 'failed' &&
              'Your browser would not let me copy it. Select the letter above and copy it yourself, or use Download as a file.'}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * A .txt download, built in the browser.
 *
 * An object URL rather than a data: URI, because the site's own CSP does not
 * allow data: navigations and a carer clicking a dead link would have no idea
 * why. Created on click and revoked afterwards so nothing leaks.
 */
function DownloadLink({ template, text }: { template: LetterTemplate; text: string }) {
  return (
    <button
      type="button"
      className="btn btn--secondary"
      onClick={() => {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template}.txt`;
        // Attached before the click, and the URL revoked on a later tick.
        // Revoking on the very next line cancelled the download before it
        // started in Safari and older Firefox, and a detached anchor is
        // ignored outright by some browsers. Nothing visible happened, which
        // this suite could not catch because it only ran Chromium.
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }}
    >
      Download as a file
    </button>
  );
}

/** "the written policy and the calculation breakdown" */
function joinAnd(titles: string[]): string {
  const lower = titles.map((t) => t.charAt(0).toLowerCase() + t.slice(1));
  if (lower.length <= 1) return lower[0] ?? '';
  return `${lower.slice(0, -1).join(', ')} and ${lower[lower.length - 1]}`;
}
