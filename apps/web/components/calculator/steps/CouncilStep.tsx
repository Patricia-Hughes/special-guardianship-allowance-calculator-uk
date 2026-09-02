'use client';

import { FLAGS } from '@sgo/engine';
import { Choice, StepNav, StepPanel } from '../fields';
import type { StepProps } from './types';

interface CouncilStepProps extends StepProps {
  /** Set on the finances step, and only true if the carer filled it in. */
  wantsMeansTest: boolean;
}

export function CouncilStep({ form, set, headingRef, goTo, run, wantsMeansTest }: CouncilStepProps) {
  return (
    <StepPanel
      heading="How your council behaves"
      headingRef={headingRef}
      stepNumber={FLAGS.MEANS_TEST_ENABLED ? 6 : 5}
    >
      <p>
        If you know any of this, it makes the guidance more useful. If you do not, leave it blank
        and the result will tell you how to find out.
      </p>

      <Choice
        type="checkbox"
        checked={form.applyChildBenefitDeduction}
        onChange={(applyChildBenefitDeduction) =>
          set((f) => ({ ...f, applyChildBenefitDeduction }))
        }
      >
        My council takes Child Benefit off my allowance
      </Choice>
      <p className="field__hint">
        We never do this unless you tick it. Whether a council may do it at all is contested, and it
        has been found wrong where the carer is on means-tested benefits.
      </p>

      <Choice
        type="checkbox"
        checked={form.childWouldOtherwiseBeInCare}
        onChange={(childWouldOtherwiseBeInCare) =>
          set((f) => ({ ...f, childWouldOtherwiseBeInCare }))
        }
      >
        Without me, this child would be in local authority care
      </Choice>

      <Choice
        type="checkbox"
        checked={form.alreadyOnReg6}
        onChange={(alreadyOnReg6) => set((f) => ({ ...f, alreadyOnReg6 }))}
      >
        I already receive special guardianship financial support from my council
      </Choice>

      <StepNav
        onBack={() => goTo(FLAGS.MEANS_TEST_ENABLED ? 'finances' : 'benefits')}
        onNext={() => {
          if (run(wantsMeansTest && FLAGS.MEANS_TEST_ENABLED)) goTo('result');
        }}
        nextLabel="Update my result"
      />
    </StepPanel>
  );
}
