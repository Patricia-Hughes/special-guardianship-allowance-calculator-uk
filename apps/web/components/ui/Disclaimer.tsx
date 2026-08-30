/**
 * [HARD R7] No output may be presented as legal advice. A persistent disclaimer
 * plus advice-line signposting appears on every page and in the printed output.
 */
export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="callout callout--important avoid-break" role="note" aria-label="Important">
      <p style={{ margin: 0 }}>
        <strong>This is an estimate, not legal advice.</strong> Financial support for special
        guardians is discretionary — there is no fixed amount you are entitled to. What this tool
        shows you is the figure your council should be starting from, and what the rules and
        published decisions say about how it must decide.
      </p>
      {!compact && (
        <p style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          Your council can lawfully pay less than the maximum after properly assessing your
          circumstances. If something here matters to your case, talk to one of the advice lines
          below before you rely on it.
        </p>
      )}
    </div>
  );
}
