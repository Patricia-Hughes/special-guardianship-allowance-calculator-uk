'use client';

import { StepNav, StepPanel } from '../fields';
import type { StepProps } from './types';

/**
 * The interstitial after step 2, spec §20.
 *
 * It exists to say out loud that the person can stop here. The figure itself
 * renders below the whole form, and pressing "Show me the figure" scrolls them
 * to it, so this step is in two pieces:
 *
 *   the heading and the reassurance stay above, where a screen reader meets
 *   them first and where someone scrolling back up finds them;
 *
 *   the offer to carry on goes below the figure, in ResultContinuation, because
 *   that is where the reader actually ends up. It used to sit up here with the
 *   heading, above the fold, and nobody ever saw it.
 */
export function ResultStep({ headingRef }: StepProps) {
  return (
    <StepPanel heading="Your result" headingRef={headingRef}>
      <p className="flush">
        This is the figure most people come here for. You do not have to answer anything else.
      </p>
    </StepPanel>
  );
}

/**
 * The offer to answer more questions, rendered inside the result panel just
 * after the figure and the caveat, and before the warnings.
 */
export function ResultContinuation({ goTo }: Pick<StepProps, 'goTo'>) {
  // print-hide: this is a control, not content, and it has no place on the page
  // a carer prints and hands to a social worker.
  return (
    <section className="panel print-hide" aria-labelledby="more-questions-heading">
      <h2 id="more-questions-heading" className="flush-top big">
        Do you want a more accurate figure?
      </h2>
      <p>
        You do not have to. What is above is the figure most people come here for, and you can
        print it or send a letter with it exactly as it is.
      </p>
      <p>
        If you tell us a little more about your situation, we can be more specific about what your
        council should be paying you, and which of the rules below apply to you.
      </p>
      <StepNav
        onBack={() => goTo('children')}
        onNext={() => goTo('history')}
        nextLabel="Answer a few more questions"
      />
    </section>
  );
}
