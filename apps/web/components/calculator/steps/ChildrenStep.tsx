'use client';

import type { RefObject } from 'react';
import { Choice, FieldError, StepNav, StepPanel, TextField } from '../fields';
import { MAX_CHILDREN, emptyChild, type ChildForm } from '../formState';
import type { StepProps } from './types';

const LOOKED_AFTER: ReadonlyArray<readonly [ChildForm['wasLookedAfterImmediatelyBeforeOrder'], string]> = [
  ['yes', 'Yes'],
  ['no', 'No'],
  ['unknown', 'I’m not sure'],
];

interface ChildrenStepProps extends StepProps {
  addChildRef: RefObject<HTMLButtonElement | null>;
  onChildAdded: (key: string) => void;
  onChildRemoved: (focusKey: string | null) => void;
}

export function ChildrenStep({
  form,
  set,
  errorFor,
  headingRef,
  goTo,
  run,
  addChildRef,
  onChildAdded,
  onChildRemoved,
}: ChildrenStepProps) {
  const updateChild = (index: number, patch: Partial<ChildForm>): void =>
    set((f) => ({
      ...f,
      children: f.children.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));

  const addChild = (): void => {
    const next = emptyChild();
    onChildAdded(next.key);
    set((f) => ({ ...f, children: [...f.children, next] }));
  };

  const removeChild = (index: number): void => {
    // Land on the child above the gap, which is where the eye already is.
    // Removing the first leaves nothing above it, so the caller falls back to
    // the Add button rather than dropping focus on the document.
    onChildRemoved(form.children[index - 1]?.key ?? null);
    set((f) => ({
      ...f,
      children: f.children.filter((_, i) => i !== index),
      // The removed child may have been the eldest, so go back to working it
      // out from the ages rather than keeping a stale index.
      eldestOverridden: false,
    }));
  };

  return (
    <StepPanel heading="About the children" headingRef={headingRef} stepNumber={2}>
      {/* Errors about the list itself rather than one child in it. */}
      <FieldError id="children-error" message={errorFor('children')} />

      {form.children.map((child, i) => (
        <fieldset key={child.key} data-child-key={child.key} className="panel">
          <legend>Child {i + 1}</legend>

          <TextField
            id={`age-${i}`}
            hintId={`age-hint-${i}`}
            errorId={`age-error-${i}`}
            label="How old are they?"
            hint="In years, from 0 to 17."
            numeric
            value={child.ageYears}
            error={errorFor(`children.${i}.ageYears`)}
            onChange={(ageYears) => updateChild(i, { ageYears })}
          />

          <Choice
            type="checkbox"
            checked={child.hasDisabilityOrAdditionalNeeds}
            onChange={(hasDisabilityOrAdditionalNeeds) =>
              updateChild(i, { hasDisabilityOrAdditionalNeeds })
            }
          >
            They have a disability or additional needs
          </Choice>

          <fieldset>
            <legend>Were they in the council&apos;s care immediately before the order was made?</legend>
            {LOOKED_AFTER.map(([value, label]) => (
              <Choice
                key={value}
                type="radio"
                name={`looked-after-${i}`}
                checked={child.wasLookedAfterImmediatelyBeforeOrder === value}
                onChange={() => updateChild(i, { wasLookedAfterImmediatelyBeforeOrder: value })}
              >
                {label}
              </Choice>
            ))}
          </fieldset>

          {form.children.length > 1 && (
            <>
              <FieldError
                id={`eldest-error-${i}`}
                message={errorFor(`children.${i}.isEldestInHousehold`)}
              />
              {/*
                No aria-invalid here. ARIA does not support it on a radio, so it
                announced nothing; the message is carried by aria-describedby
                and its own role="alert", which do work.
              */}
              <Choice
                type="radio"
                name="eldest"
                checked={form.eldestIndex === i}
                {...(errorFor(`children.${i}.isEldestInHousehold`)
                  ? { describedBy: `eldest-error-${i}` }
                  : {})}
                onChange={() => set((f) => ({ ...f, eldestIndex: i, eldestOverridden: true }))}
              >
                This is the eldest child in the household
              </Choice>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => removeChild(i)}
              >
                Remove child {i + 1}
              </button>
            </>
          )}
        </fieldset>
      ))}

      {form.children.length < MAX_CHILDREN && (
        <button type="button" className="btn btn--secondary" ref={addChildRef} onClick={addChild}>
          Add another child
        </button>
      )}

      <StepNav
        onBack={() => goTo('where')}
        onNext={() => {
          if (run(false)) goTo('result');
        }}
        nextLabel="Show me the figure"
      />
    </StepPanel>
  );
}
