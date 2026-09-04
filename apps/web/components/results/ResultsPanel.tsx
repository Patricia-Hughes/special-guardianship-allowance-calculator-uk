'use client';

import type { ReactNode } from 'react';
import { FLAGS, type CalculatorInput, type CalculatorResult, type Citation } from '@sgo/engine';
import { MaximumHero } from './MaximumHero';
import { PrintedInputs } from './PrintedInputs';
import { EstimateCard } from './EstimateCard';
import { PerChildTable } from './PerChildTable';
import { ArithmeticPanel } from './ArithmeticPanel';
import { BackdatingPanel } from './BackdatingPanel';
import { LettersPanel } from './LettersPanel';
import { NextSteps } from './NextSteps';
import { PrintButton } from './PrintButton';
import { FlagList } from '../flags/FlagList';
import { CitationsList } from '../ui/SourceLink';
import { Disclaimer } from '../ui/Disclaimer';
import { AdviceLines } from '../ui/AdviceLines';
import { useCopyToClipboard } from '../ui/useCopyToClipboard';
import { SHARE_EXPLANATION } from '../../lib/urlState';

/**
 * Output order matters, spec §21. Lead with the ceiling, not the estimate:
 *
 *   1. the maximum        5. the arithmetic
 *   2. the estimate       6. what to do next
 *   3. per-child table    7. citations
 *   4. flags              8. download / print
 */
export function ResultsPanel({
  result,
  input,
  regionLabel,
  councilName,
  shareUrl,
  continuation,
}: {
  result: CalculatorResult;
  input: CalculatorInput;
  regionLabel?: string;
  councilName?: string;
  shareUrl?: string;
  /**
   * The offer to answer more questions, on the interstitial step.
   *
   * It belongs here rather than in the form above, because pressing "Show me
   * the figure" scrolls the reader down to the figure. Anything left above it
   * is never seen. This is where the eye actually lands: after the number, the
   * per-child table and the caveat, and before the wall of warnings.
   */
  continuation?: ReactNode;
}) {
  const citations: Citation[] = result.perChild.flatMap((c) => c.citations);
  for (const f of result.flags) if (f.citation) citations.push(f.citation);

  return (
    <div className="section">
      <PrintHeader result={result} />
      <PrintedInputs input={input} {...(councilName ? { councilName } : {})} />

      <MaximumHero result={result} {...(regionLabel ? { regionLabel } : {})} />
      <EstimateCard result={result} />
      <PerChildTable result={result} />

      <Disclaimer />

      {continuation}

      <FlagList flags={result.flags} />

      {result.meansTestBreakdown && <ArithmeticPanel breakdown={result.meansTestBreakdown} />}

      {FLAGS.BACKDATING_ENABLED && <BackdatingPanel input={input} />}

      <NextSteps result={result} />

      {FLAGS.LETTER_GENERATOR && (
        <LettersPanel result={result} input={input} {...(councilName ? { councilName } : {})} />
      )}
      <CitationsList citations={citations} />

      <PrintButton />
      {shareUrl && <ShareControl url={shareUrl} />}

      <AdviceLines />

      <p className="muted small">
        Calculated {new Date(result.computedAt).toLocaleString('en-GB')} · rates{' '}
        {result.financialYear.replace('-', '/')} (data version {result.dataVersion}) · engine{' '}
        {result.engineVersion}
      </p>
    </div>
  );
}

/**
 * Printed at the top of the page (§19 item 1) and hidden on screen, the carer
 * hands this to a social worker, so it needs to say what it is and when it was
 * produced.
 */
function PrintHeader({ result }: { result: CalculatorResult }) {
  return (
    <div className="print-only avoid-break">
      <h2 className="flush-top">Special guardianship allowance estimate</h2>
      <p>
        Generated {new Date(result.computedAt).toLocaleDateString('en-GB')} · rates for financial
        year {result.financialYear.replace('-', '/')} · produced with an online calculator, not by a
        solicitor or a council.
      </p>
    </div>
  );
}

function ShareControl({ url }: { url: string }) {
  const { state, copy } = useCopyToClipboard();
  return (
    <div className="print-hide share">
      <h2 className="big">Share this result</h2>
      <p>{SHARE_EXPLANATION}</p>
      <button type="button" className="btn btn--secondary" onClick={() => copy(url)}>
        Copy the link
      </button>
      <p aria-live="polite" className="share__status">
        {state === 'done' && 'Link copied.'}
        {state === 'failed' &&
          'Your browser would not let me copy it. Select the address in the bar at the top and copy it yourself.'}
      </p>
    </div>
  );
}
