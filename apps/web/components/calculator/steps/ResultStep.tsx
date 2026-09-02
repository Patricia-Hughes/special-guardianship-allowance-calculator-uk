'use client';

import { StepNav, StepPanel } from '../fields';
import type { StepProps } from './types';

/**
 * The interstitial after step 2, spec §20.
 *
 * It exists to say out loud that the person can stop here. The figure itself
 * renders below the whole form, so this panel is only the heading and the
 * choice of whether to go on.
 */
export function ResultStep({ headingRef, goTo }: StepProps) {
  return (
    <StepPanel heading="Your result" headingRef={headingRef}>
      <p>This is the figure most people come here for. You do not have to answer anything else.</p>
      <StepNav
        onBack={() => goTo('children')}
        onNext={() => goTo('history')}
        nextLabel="Answer a few more questions"
        nextSecondary
      />
    </StepPanel>
  );
}
