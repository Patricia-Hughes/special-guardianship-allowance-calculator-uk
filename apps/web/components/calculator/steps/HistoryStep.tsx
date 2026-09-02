'use client';

import { MoneyInput } from '../MoneyInput';
import { Choice, StepNav, StepPanel, TextField } from '../fields';
import type { StepProps } from './types';

export function HistoryStep({ form, set, errorFor, headingRef, goTo, run }: StepProps) {
  return (
    <StepPanel heading="Your history with this child" headingRef={headingRef} stepNumber={3}>
      <Choice
        type="checkbox"
        checked={form.wasFosterCarer}
        onChange={(wasFosterCarer) => set((f) => ({ ...f, wasFosterCarer }))}
      >
        I was this child&apos;s foster carer before the order was made
      </Choice>

      {form.wasFosterCarer && (
        <>
          <MoneyInput
            label="What were you paid as a foster carer, per week?"
            hint="Including the reward or fee element. Your council can keep paying that part for two years after the order."
            name="previousWeeklyFosteringAllowance"
            required
            value={form.previousAllowance.raw}
            error={errorFor('carer.previousWeeklyFosteringAllowance')}
            onChange={(raw, pence) => set((f) => ({ ...f, previousAllowance: { raw, pence } }))}
          />
          <TextField
            id="order-date"
            type="date"
            label="When was the special guardianship order made?"
            hint="If you are not sure of the exact day, the month is close enough."
            value={form.orderDate}
            error={errorFor('carer.orderDate')}
            onChange={(orderDate) => set((f) => ({ ...f, orderDate }))}
          />
        </>
      )}

      <TextField
        id="months-since"
        label="Roughly how many months ago was the order made?"
        hint="Leave blank if you gave the date above."
        numeric
        value={form.monthsSinceOrder}
        // The allowance error lands here too: it is the answer that decides
        // whether the reg 7 window is even open, and it is the box on screen.
        error={
          errorFor('carer.monthsSinceOrderMade') ??
          errorFor('carer.previousWeeklyFosteringAllowance')
        }
        onChange={(monthsSinceOrder) => set((f) => ({ ...f, monthsSinceOrder }))}
      />

      <StepNav
        onBack={() => goTo('result')}
        onNext={() => {
          if (run(false)) goTo('benefits');
        }}
      />
    </StepPanel>
  );
}
