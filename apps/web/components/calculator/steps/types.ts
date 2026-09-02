import type { RefObject } from 'react';
import type { CalculatorForm } from '../formState';
import type { StepId } from '../steps';

/**
 * What every step is given.
 *
 * Steps hold no state of their own. They read the answers, ask for a change,
 * and say where to go next; the shell owns everything else. That is what makes
 * a step readable on its own and what stops a question quietly acquiring its
 * own private copy of an answer.
 */
export interface StepProps {
  form: CalculatorForm;
  set: (update: (form: CalculatorForm) => CalculatorForm) => void;
  /** The message for one field, or undefined when that field is fine. */
  errorFor: (path: string) => string | undefined;
  headingRef: RefObject<HTMLHeadingElement | null>;
  goTo: (step: StepId) => void;
  /**
   * Recalculate. Returns false when the answers do not validate, so a step can
   * decline to move on: advancing past a wrong field leaves the message on a
   * screen the person has just left, which is how "it shows nothing" happens.
   */
  run: (withFinances: boolean) => boolean;
}
