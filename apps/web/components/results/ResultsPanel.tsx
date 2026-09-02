'use client';

import { useState } from 'react';
import { FLAGS, type CalculatorInput, type CalculatorResult, type Citation } from '@sgo/engine';
import { MaximumHero } from './MaximumHero';
import { PrintedInputs } from './PrintedInputs';
import { EstimateCard } from './EstimateCard';
import { PerChildTable } from './PerChildTable';
import { ArithmeticPanel } from './ArithmeticPanel';
import { BackdatingPanel } from './BackdatingPanel';
import { NextSteps } from './NextSteps';
import { PrintButton } from './PrintButton';
import { FlagList } from '../flags/FlagList';
import { CitationsList } from '../ui/SourceLink';
import { Disclaimer } from '../ui/Disclaimer';
import { AdviceLines } from '../ui/AdviceLines';
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
}: {
  result: CalculatorResult;
  input: CalculatorInput;
  regionLabel?: string;
  councilName?: string;
  shareUrl?: string;
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

      <FlagList flags={result.flags} />

      {result.meansTestBreakdown && <ArithmeticPanel breakdown={result.meansTestBreakdown} />}

      {FLAGS.BACKDATING_ENABLED && <BackdatingPanel input={input} />}

      <NextSteps result={result} />
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
  const [copied, setCopied] = useState(false);
  return (
    <div className="print-hide share">
      <h2 className="big">Share this result</h2>
      <p>{SHARE_EXPLANATION}</p>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
      >
        Copy the link
      </button>
      <p aria-live="polite" className="share__status">
        {copied ? 'Link copied.' : ''}
      </p>
    </div>
  );
}
