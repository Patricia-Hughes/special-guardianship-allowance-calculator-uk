import type { Citation } from '@sgo/engine';

/**
 * A citation, with its URL and retrieval date. [R3] Every numeric output
 * carries the citation it derives from.
 *
 * Where a citation has no URL yet, we say so plainly rather than rendering a
 * dead link, an unsourced claim looks worse than an acknowledged gap, and the
 * gap is tracked (spec §42 item 9).
 */
export function SourceLink({ citation }: { citation: Citation }) {
  return (
    <span>
      {citation.url ? (
        <a href={citation.url} rel="noopener">
          {citation.label}
        </a>
      ) : (
        <span>{citation.label}</span>
      )}{' '}
      <span style={{ color: 'var(--colour-text-muted)', fontSize: 'var(--font-size-sm)' }}>
        {citation.url ? (
          <>(checked {citation.retrieved})</>
        ) : (
          <>(we are still sourcing a public link for this)</>
        )}
      </span>
    </span>
  );
}

export function CitationsList({ citations }: { citations: Citation[] }) {
  const unique = Array.from(new Map(citations.map((c) => [c.id, c])).values());
  if (unique.length === 0) return null;
  return (
    <section className="avoid-break" aria-labelledby="citations-heading">
      <h2 id="citations-heading">Where these figures and rules come from</h2>
      <ul>
        {unique.map((c) => (
          <li key={c.id} className="citation-item">
            <SourceLink citation={c} />
            {c.holding && (
              <div style={{ color: 'var(--colour-text-muted)', marginTop: '0.25rem' }}>
                {c.holding}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
