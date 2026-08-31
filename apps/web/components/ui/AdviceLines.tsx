/**
 * Advice-line signposting, required on every result and every page (R7).
 * These are national organisations with kinship-care expertise; the contact
 * details are deliberately not stored as data because they are not figures the
 * engine uses, but they must be checked at each content review.
 */
export function AdviceLines({ headingId = 'advice-lines-heading' }: { headingId?: string } = {}) {
  return (
    <section className="avoid-break" aria-labelledby={headingId}>
      <h2 id={headingId}>Who can help</h2>
      <p>
        These organisations give free, independent advice on kinship care and special
        guardianship. They are not part of your council.
      </p>
      <ul>
        <li>
          <strong>Kinship</strong>: advice and peer support for kinship carers.{' '}
          <a href="https://kinship.org.uk/" rel="noopener">
            kinship.org.uk
          </a>
        </li>
        <li>
          <strong>Family Rights Group</strong>: free advice line for families dealing with
          children&apos;s services.{' '}
          <a href="https://frg.org.uk/" rel="noopener">
            frg.org.uk
          </a>
        </li>
        <li>
          <strong>Citizens Advice</strong>: benefits, debt and general advice.{' '}
          <a href="https://www.citizensadvice.org.uk/" rel="noopener">
            citizensadvice.org.uk
          </a>
        </li>
        <li>
          <strong>Local Government and Social Care Ombudsman</strong> (England), if you have
          complained to your council and are not satisfied.{' '}
          <a href="https://www.lgo.org.uk/" rel="noopener">
            lgo.org.uk
          </a>
        </li>
      </ul>
    </section>
  );
}
