'use client';

import { useId, useState } from 'react';
import { parseMoney } from '@sgo/engine';

/**
 * [§24] inputMode="decimal", NOT type="number", spinners are hostile to screen
 * readers and to shaky hands. Parsing happens once, here, at the boundary (§10).
 *
 * Validates on blur, not on keystroke (§20.1). Never clears the field on error.
 */
export function MoneyInput({
  label,
  hint,
  name,
  value,
  onChange,
  required = false,
  error: externalError,
}: {
  label: string;
  hint?: string;
  name: string;
  value: string;
  onChange: (raw: string, pence: number | null) => void;
  required?: boolean;
  /**
   * A message from the engine's own validation, as opposed to the parse error
   * this component raises itself. Shown in the same place, so a field never
   * ends up with two messages, and never repeats one already in the summary.
   */
  error?: string;
}) {
  const id = useId();
  const [parseError, setParseError] = useState<string | null>(null);
  // The typing error wins while it stands: it is about what is in the box now.
  const error = parseError ?? externalError ?? null;

  const validate = (raw: string): void => {
    if (raw.trim() === '') {
      setParseError(required ? 'Enter an amount.' : null);
      onChange(raw, required ? null : 0);
      return;
    }
    try {
      const p = parseMoney(raw);
      setParseError(null);
      onChange(raw, p);
    } catch {
      setParseError('Enter an amount like 1250 or 1250.50.');
      onChange(raw, null);
    }
  };

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <span className="field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <span aria-hidden="true" style={{ fontWeight: 600 }}>
          £
        </span>
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
            undefined
          }
          onChange={(e) => onChange(e.target.value, null)}
          onBlur={(e) => validate(e.target.value)}
        />
      </span>
    </div>
  );
}
