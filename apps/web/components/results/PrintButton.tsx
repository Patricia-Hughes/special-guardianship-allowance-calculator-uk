'use client';

/**
 * "The single most important call to action on the page" (spec §21 item 8).
 *
 * Print stylesheet first, PDF library second (§19): window.print() plus a
 * well-built print.css gets 90% of the value at 5% of the cost, and works with
 * the browser's own "Save as PDF".
 */
export function PrintButton() {
  return (
    <div id="print" className="print-hide gap-xl">
      <button type="button" className="btn" onClick={() => window.print()}>
        Print this, or save it as a PDF
      </button>
      <p className="gap-md muted">
        The printed version has your figures, the full arithmetic and every source on it, ready to
        hand to your social worker. In the print dialogue, choose &ldquo;Save as PDF&rdquo; if you
        would rather email it.
      </p>
    </div>
  );
}
