/**
 * [HARD R7] No output may be presented as legal advice. A persistent disclaimer
 * plus advice-line signposting appears on every page and in the printed output.
 */
export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="callout callout--important avoid-break" role="note" aria-label="Important">
      <p className="flush">
        <strong>This is an estimate, not legal advice.</strong> Financial support for special
        guardians is discretionary, and there is no fixed amount you can require your council to
        pay. It shows you the figure your council should be starting from, and what the rules and
        the published decisions say about how it has to decide.
      </p>
      {!compact && (
        <p className="gap-md flush-bot">
          Your council can lawfully pay less than the maximum after properly assessing your
          circumstances. If something here matters to your case, talk to one of the advice lines
          below before you rely on it.
        </p>
      )}
    </div>
  );
}
