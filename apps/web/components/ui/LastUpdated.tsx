/**
 * "Last reviewed" is both an E-E-A-T signal and an honesty signal (spec §26).
 */
export function LastUpdated({
  updated,
  reviewed,
  ratesFinancialYear,
}: {
  updated: string;
  reviewed?: string;
  ratesFinancialYear?: string;
}) {
  return (
    <p style={{ color: 'var(--colour-text-muted)', fontSize: 'var(--font-size-sm)' }}>
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
