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
}: {
  label: string;
  hint?: string;
  name: string;
  value: string;
  onChange: (raw: string, pence: number | null) => void;
  required?: boolean;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  const validate = (raw: string): void => {
    if (raw.trim() === '') {
      setError(required ? 'Enter an amount.' : null);
      onChange(raw, required ? null : 0);
      return;
    }
    try {
      const p = parseMoney(raw);
      setError(null);
      onChange(raw, p);
    } catch {
      setError('Enter an amount like 1250 or 1250.50.');
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
