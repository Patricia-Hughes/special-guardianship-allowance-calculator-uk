'use client';

/**
 * Taking the person to whatever just changed.
 *
 * The form grows and shrinks as it is used, and on a phone the part that
 * changed is usually below the fold. Someone who presses a button and sees
 * nothing move concludes the button is broken.
 *
 * Focus is moved alongside the scroll throughout. Scrolling is what a sighted
 * user notices; focus is what a screen reader and a keyboard follow, and it is
 * the one that must not be lost when a row is removed from under it.
 */

import { useEffect, type RefObject } from 'react';
import { scrollToElementAfterPaint } from '../../lib/scrollTo';
import type { StepId } from './steps';

const childRow = (key: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-child-key="${key}"]`);

export function useStepFocus({
  step,
  hasResult,
  headingRef,
  resultsRef,
}: {
  step: StepId;
  hasResult: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  resultsRef: RefObject<HTMLDivElement | null>;
}): void {
  useEffect(() => {
    if (step === 'where') return;
    const heading = headingRef.current;

    // On the result step these two want different places: the heading says
    // "Your result", the figure itself renders below the whole form. Scrolling
    // to both meant they raced, and on a short screen the figure lost. The
    // figure wins, and focus still goes to the heading so a screen reader
    // announces the step rather than jumping into the middle of the answer.
    if (step === 'result' && hasResult) {
      try {
        heading?.focus({ preventScroll: true });
      } catch {
        heading?.focus();
      }
      scrollToElementAfterPaint(() => resultsRef.current);
      return;
    }

    scrollToElementAfterPaint(() => heading, { focus: true });
  }, [step, hasResult, headingRef, resultsRef]);
}

/**
 * Where to land after a child row is added or removed.
 *
 * One pending value rather than two, because "nothing to do" and "land on the
 * Add button" are different things and a bare null cannot say both. An earlier
 * version used a sentinel string for the second; naming the two cases is
 * clearer and cannot be confused with a real child key.
 */
export type PendingChildFocus =
  | { kind: 'added'; key: string }
  /** key null: the first child went, so there is no row above the gap. */
  | { kind: 'removed'; key: string | null };

/**
 * Scrolling to the row rather than to the box inside it keeps "Child 2" and the
 * question on screen; focus still goes to the box, so the next keystroke lands
 * where it should. Removing the first child falls back to the Add button,
 * because focus would otherwise be lost to the document body.
 */
export function useChildFocus({
  pending,
  onHandled,
  addChildRef,
}: {
  pending: PendingChildFocus | null;
  onHandled: () => void;
  addChildRef: RefObject<HTMLButtonElement | null>;
}): void {
  useEffect(() => {
    if (!pending) return;
    onHandled();
    scrollToElementAfterPaint(
      () => (pending.key ? childRow(pending.key) : null) ?? addChildRef.current,
      { focusWithin: 'input' },
    );
  }, [pending, onHandled, addChildRef]);
}
