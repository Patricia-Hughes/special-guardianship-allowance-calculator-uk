'use client';

import { MoneyInput } from '../MoneyInput';
import { StepNav, StepPanel, TextField } from '../fields';
import { MONEY_FIELDS } from '../formState';
import type { StepProps } from './types';

interface FinancesStepProps extends StepProps {
  /** Whether the answers here should feed the next calculation. */
  onWantsMeansTest: (wants: boolean) => void;
}

export function FinancesStep({
  form,
  set,
  errorFor,
  headingRef,
  goTo,
  run,
  onWantsMeansTest,
}: FinancesStepProps) {
  // The carer's own answer wins once they have given one, even if they later
  // add a child: they know their household and we do not.
  const householdChildren = form.householdChildrenTouched
    ? form.householdChildren
    : String(form.children.length);

  return (
    <StepPanel heading="Your finances" headingRef={headingRef} stepNumber={5}>
      <div className="callout" role="note" aria-label="Note">
        <p className="flush">
          <strong>You can skip this.</strong> Fill it in only if you want an estimate of what you
          might get after a means test. Nothing you type here leaves your browser, there is no
          server to send it to.
        </p>
      </div>

      {MONEY_FIELDS.map(([name, label, hint]) => (
        <MoneyInput
          key={name}
          name={name}
          label={label}
          {...(hint ? { hint } : {})}
          value={form.money[name].raw}
          error={errorFor(`finances.${name}`)}
          onChange={(raw, pence) =>
            set((f) => ({ ...f, money: { ...f.money, [name]: { raw, pence } } }))
          }
        />
      ))}

      <TextField
        id="adults"
        label="How many adults live in your household?"
        numeric
        value={form.adults}
        error={errorFor('finances.adultsInHousehold')}
        onChange={(adults) => set((f) => ({ ...f, adults }))}
      />
      <TextField
        id="household-children"
        label="How many dependent children live in your household?"
        hint="Include the children you have already told me about, plus any others."
        numeric
        // Starts at the number of children already entered, not at 1. It used
        // to sit at 1 however many children the carer had added, so anyone
        // with two or more was stopped by a validation error on a box they had
        // never touched, carrying a number we had put there.
        value={householdChildren}
        error={errorFor('finances.dependentChildrenInHousehold')}
        onChange={(next) => set((f) => ({ ...f, householdChildren: next, householdChildrenTouched: true }))}
      />

      <StepNav
        onBack={() => goTo('benefits')}
        onNext={() => {
          onWantsMeansTest(true);
          if (run(true)) goTo('council');
        }}
        onSkip={() => {
          onWantsMeansTest(false);
          goTo('council');
        }}
      />
    </StepPanel>
  );
}
