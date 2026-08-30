import type { ReactNode } from 'react';

type CalloutType = 'info' | 'important' | 'critical';

const LABEL: Record<CalloutType, string> = {
  info: 'Note',
  important: 'Important',
  critical: 'Important — please read',
};

/**
 * Severity is never signalled by colour alone (spec §23): every callout carries
 * a text label as well as its colour.
 */
export function Callout({
  type = 'info',
  children,
}: {
  type?: CalloutType;
  children: ReactNode;
}) {
  return (
    <div className={`callout callout--${type} avoid-break`} role="note" aria-label={LABEL[type]}>
      <p style={{ fontWeight: 700, margin: '0 0 0.5rem' }}>{LABEL[type]}</p>
      {children}
    </div>
  );
}
