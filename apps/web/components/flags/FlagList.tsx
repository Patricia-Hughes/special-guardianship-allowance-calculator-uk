import type { Flag } from '@sgo/engine';
import { FlagCard } from './FlagCard';

/**
 * Flags arrive already sorted by the engine (critical → important → info, then
 * by financial impact within a severity). The list does not re-sort them: the
 * ordering is a legal-content decision, made once, in the engine.
 */
export function FlagList({ flags }: { flags: Flag[] }) {
  if (flags.length === 0) return null;

  const counts = flags.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section aria-labelledby="flags-heading">
      <h2 id="flags-heading">What to check with your council</h2>
      <p className="sr-only">
        {counts.critical ?? 0} critical, {counts.important ?? 0} important and {counts.info ?? 0}{' '}
        informational points.
      </p>
      {flags.map((f) => (
        <FlagCard key={f.code} flag={f} />
      ))}
    </section>
  );
}
