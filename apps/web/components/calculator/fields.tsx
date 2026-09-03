'use client';

/**
 * The form furniture, in one place.
 *
 * Every repeated pattern in the calculator is here rather than typed out again
 * per step: the same error goes in the same place, the same hint is wired to
 * the same aria-describedby, and a step cannot quietly grow a field that
 * announces itself differently from all the others.
 */

import type { ReactNode, RefObject } from 'react';

/** One message, in one place: beside the box it belongs to. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span className="field__error" id={id} role="alert">
      {message}
    </span>
  );
}

/**
 * A labelled text box with an optional hint and an optional error.
 *
 * inputMode rather than type="number": spinners are hostile to screen readers
 * and to shaky hands (§24). The message sits next to the box as well as in the
 * summary at the top, because someone who types 80 and presses the button is
 * looking at the box, not the top of the page.
 */
export function TextField({
  id,
  label,
  hint,
  value,
  error,
  type = 'text',
  numeric = false,
  hintId: hintIdOverride,
  errorId: errorIdOverride,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  error?: string;
  type?: 'text' | 'date';
  numeric?: boolean;
  /**
   * The hint and error elements are `<id>-hint` and `<id>-error` unless given.
   * The repeated child rows are the exception: their boxes are `age-0` but
   * their messages are `age-error-0`, which is the shape the error summary and
   * the tests both address them by.
   */
  hintId?: string;
  errorId?: string;
  onChange: (value: string) => void;
}) {
  const hintId = hintIdOverride ?? `${id}-hint`;
  const errorId = errorIdOverride ?? `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      )}
      <FieldError id={errorId} message={error} />
      <input
        id={id}
        type={type}
        {...(numeric ? { inputMode: 'numeric' as const } : {})}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** A checkbox or radio with its label, sized as one tap target. */
export function Choice({
  type,
  name,
  value,
  checked,
  onChange,
  children,
  describedBy,
}: {
  type: 'checkbox' | 'radio';
  name?: string;
  value?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  /** The id of a message describing this choice, when one is showing. */
  describedBy?: string;
}) {
  return (
    // The selected state carries a class rather than relying on CSS :has().
    // :has() is unsupported on Safari below 15.4 and older Firefox, which is
    // exactly the older tablet this site is built for, and there the border and
    // tint marking the chosen answer silently vanished, leaving only the small
    // radio dot. React already knows what is checked, so it can just say so.
    <label className={checked ? 'choice choice--on' : 'choice'}>
      <input
        type={type}
        {...(name ? { name } : {})}
        {...(value ? { value } : {})}
        checked={checked}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

/** A group of radios sharing one name, under a legend. */
export function RadioGroup<T extends string>({
  legend,
  name,
  options,
  selected,
  onSelect,
  id,
  children,
  footer,
}: {
  legend: string;
  name: string;
  options: ReadonlyArray<readonly [T, string]>;
  selected: T | '';
  onSelect: (value: T) => void;
  id?: string;
  /** Hints and errors shown above the options. */
  children?: ReactNode;
  /** Anything that belongs to the group but reads after it. Inside the
   * fieldset, so a screen reader still announces it as part of the question. */
  footer?: ReactNode;
}) {
  return (
    <fieldset {...(id ? { id } : {})}>
      <legend>{legend}</legend>
      {children}
      {options.map(([value, label]) => (
        <label className="choice" key={value}>
          <input
            type="radio"
            name={name}
            value={value}
            checked={selected === value}
            onChange={() => onSelect(value)}
          />
          <span>{label}</span>
        </label>
      ))}
      {footer}
    </fieldset>
  );
}

export function StepPanel({
  heading,
  stepNumber,
  headingRef,
  children,
}: {
  heading: string;
  stepNumber?: number;
  headingRef: RefObject<HTMLHeadingElement | null>;
  children: ReactNode;
}) {
  return (
    <section>
      {stepNumber && <p className="step-label">Step {stepNumber}</p>}
      <h2 ref={headingRef} tabIndex={-1} className="gap-sm">
        {heading}
      </h2>
      {children}
    </section>
  );
}

/** A visible "back" on every step. The form must never trap keyboard users. */
export function StepNav({
  onBack,
  onNext,
  onSkip,
  nextLabel = 'Continue',
  nextDisabled = false,
  nextSecondary = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextSecondary?: boolean;
}) {
  return (
    <div className="row gap-lg">
      {onBack && (
        <button type="button" className="btn btn--secondary" onClick={onBack}>
          Back
        </button>
      )}
      <button
        type="button"
        className={nextSecondary ? 'btn btn--secondary' : 'btn'}
        onClick={onNext}
        disabled={nextDisabled}
      >
        {nextLabel}
      </button>
      {onSkip && (
        <button type="button" className="btn btn--secondary" onClick={onSkip}>
          Skip this step
        </button>
      )}
    </div>
  );
}
