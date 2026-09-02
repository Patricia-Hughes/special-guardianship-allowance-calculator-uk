'use client';

/**
 * The two things the calculator says when it cannot simply answer.
 */

import type { RefObject } from 'react';
import { FIELD_ANCHORS } from './steps';

export interface FormIssue {
  path: string;
  message: string;
}

/**
 * [§24] Errors with no box on the current step to sit beside.
 *
 * Only these reach the summary, so nothing is said twice and nothing goes
 * unsaid either. Each links to the field that failed: a list of messages with
 * no way to reach the input is close to useless to a screen-reader or keyboard
 * user on a six-step form.
 */
export function ErrorSummary({
  issues,
  summaryRef,
}: {
  issues: FormIssue[];
  summaryRef: RefObject<HTMLDivElement | null>;
}) {
  if (issues.length === 0) return null;
  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      className="callout callout--critical"
      aria-labelledby="error-summary-heading"
    >
      <h2 id="error-summary-heading" className="flush-top big">
        There is a problem
      </h2>
      <ul className="flush">
        {issues.map((issue, i) => {
          const anchor = FIELD_ANCHORS[issue.path];
          return (
            <li key={i}>{anchor ? <a href={`#${anchor}`}>{issue.message}</a> : issue.message}</li>
          );
        })}
      </ul>
    </div>
  );
}

export type EngineErrorKind = 'guardrail' | 'data';

/**
 * [§15, §33] A GuardrailViolation is never shown raw to a user. A DataError
 * says what we do not have, rather than pretending.
 */
export function EngineErrorFallback({ kind }: { kind: EngineErrorKind }) {
  return (
    <div className="callout callout--critical" role="alert">
      <h2 className="flush-top big">
        {kind === 'guardrail'
          ? "We can't produce a reliable estimate for your situation"
          : "We don't have verified figures for that"}
      </h2>
      <p>
        {kind === 'guardrail'
          ? 'Something about your answers means we cannot give you a figure we are confident is right. We would rather tell you that than show you a number that might be wrong.'
          : 'Rather than guess, we have stopped. This usually means we do not yet hold a verified rate table or benefit figure for the date or the situation you gave us.'}
      </p>
      <p className="flush-bot">
        Please talk to one of the advice organisations listed at the bottom of this page, they can
        look at your case properly.
      </p>
    </div>
  );
}
