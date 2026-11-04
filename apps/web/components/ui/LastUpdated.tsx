/**
 * "Last reviewed" is both an E-E-A-T signal and an honesty signal (spec §26).
 *
 * The byline sits in the same line rather than under the heading, because the
 * name and the date only mean anything together: a reviewer with no date, or a
 * date with no reviewer, is the half-claim this line exists to avoid.
 */
export function LastUpdated({
  author,
  updated,
  reviewed,
  ratesFinancialYear,
}: {
  author?: string;
  updated: string;
  reviewed?: string;
  ratesFinancialYear?: string;
}) {
  return (
    <p className="muted small">
      {author && (
        <>
          Written and reviewed by <a href="/about"><strong>{author}</strong></a>
          {' · '}
        </>
      )}
      Last updated <time dateTime={updated}>{formatDate(updated)}</time>
      {reviewed && (
        <>
          {' · '}last reviewed <time dateTime={reviewed}>{formatDate(reviewed)}</time>
        </>
      )}
      {ratesFinancialYear && <> · rates for {ratesFinancialYear.replace('-', '/')}</>}
    </p>
  );
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}
