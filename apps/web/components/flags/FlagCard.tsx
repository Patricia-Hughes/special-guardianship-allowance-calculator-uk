import type { Flag, FlagSeverity } from '@sgo/engine';
import { SourceLink } from '../ui/SourceLink';
import { Markdown } from '../ui/Markdown';

/**
 * [§23] Severity must NEVER be signalled by colour alone. Every card carries an
 * icon and a text label as well as its colour.
 */
const SEVERITY: Record<FlagSeverity, { label: string; icon: string; colour: string }> = {
  critical: { label: 'Critical', icon: '!', colour: 'var(--colour-critical)' },
  important: { label: 'Important', icon: '!', colour: 'var(--colour-important)' },
  info: { label: 'Worth knowing', icon: 'i', colour: 'var(--colour-info)' },
};

export function FlagCard({ flag }: { flag: Flag }) {
  const s = SEVERITY[flag.severity];
  return (
    <article
      className="flag-card avoid-break"
      style={{
        border: `2px solid ${s.colour}`,
        borderLeftWidth: '6px',
        borderRadius: 'var(--radius)',
        padding: '1rem 1.25rem',
        marginBottom: '1rem',
      }}
    >
      <p
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          margin: '0 0 0.5rem',
          color: s.colour,
          fontWeight: 700,
          fontSize: 'var(--font-size-sm)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '50%',
            border: `2px solid ${s.colour}`,
            fontSize: '0.9rem',
          }}
        >
          {s.icon}
        </span>
        {s.label}
      </p>
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem' }}>{flag.title}</h3>
      <Markdown>{flag.body}</Markdown>
      {flag.citation && (
        <p style={{ margin: '0.75rem 0 0', fontSize: 'var(--font-size-sm)' }}>
          Source: <SourceLink citation={flag.citation} />
        </p>
      )}
      {flag.actionUrl && (
        <p style={{ margin: '0.75rem 0 0' }}>
          <a href={flag.actionUrl}>Read more about this</a>
        </p>
      )}
    </article>
  );
}
