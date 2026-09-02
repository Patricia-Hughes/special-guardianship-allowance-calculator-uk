'use client';

import { FLAGS } from '@sgo/engine';
import { Choice, StepNav, StepPanel } from '../fields';
import { MEANS_TESTED_BENEFITS } from '../formState';
import type { StepProps } from './types';

export function BenefitsStep({ form, set, headingRef, goTo, run }: StepProps) {
  return (
    <StepPanel heading="Benefits you receive" headingRef={headingRef} stepNumber={4}>
      <p>
        This does not change your figure. It tells us which rules about your council&apos;s
        behaviour apply to you.
      </p>

      <Choice
        type="checkbox"
        checked={form.onMeansTestedBenefits}
        onChange={(onMeansTestedBenefits) => set((f) => ({ ...f, onMeansTestedBenefits }))}
      >
        I receive at least one means-tested benefit
      </Choice>

      {form.onMeansTestedBenefits && (
        <fieldset>
          <legend>Which ones? (optional)</legend>
          {MEANS_TESTED_BENEFITS.map((benefit) => (
            <Choice
              key={benefit.id}
              type="checkbox"
              checked={form.benefitsHeld.includes(benefit.id)}
              onChange={(held) =>
                set((f) => ({
                  ...f,
                  benefitsHeld: held
                    ? [...f.benefitsHeld, benefit.id]
                    : f.benefitsHeld.filter((x) => x !== benefit.id),
                }))
              }
            >
              {benefit.label}
            </Choice>
          ))}
        </fieldset>
      )}

      <StepNav
        onBack={() => goTo('history')}
        onNext={() => {
          if (run(false)) goTo(FLAGS.MEANS_TEST_ENABLED ? 'finances' : 'council');
        }}
      />
    </StepPanel>
  );
}
