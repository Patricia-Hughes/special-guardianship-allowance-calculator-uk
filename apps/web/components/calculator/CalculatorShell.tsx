'use client';

/**
 * Step orchestration, spec §20.
 *
 * The rule that shapes everything here: NEVER ask for finances before showing
 * the maximum. The interstitial result after step 2 is the number most users
 * came for, and it must not be gated behind a means test they may not want to
 * complete.
 *
 * No localStorage or sessionStorage for anything (§22). A shared or family
 * computer is the normal case for this audience, and there is no server to send
 * anything to either: the whole calculation runs in the page.
 *
 * This file holds the state and decides what is on screen. Each step renders
 * itself, the answers and the arithmetic live in formState.ts, and neither
 * knows about the other.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DataError,
  GuardrailViolation,
  LA_NAMES,
  FLAGS,
  ValidationError,
  calculate,
  type CalculatorInput,
  type CalculatorResult,
} from '@sgo/engine';
import { ResultsPanel } from '../results/ResultsPanel';
import { SHARE_EXPLANATION, toQueryString, fromQueryString } from '../../lib/urlState';
import { EngineErrorFallback, ErrorSummary, type EngineErrorKind, type FormIssue } from './errors';
import {
  buildInput,
  emptyChild,
  emptyForm,
  indexOfOldest,
  shareableState,
  type CalculatorForm,
} from './formState';
import { isAfter, stepForPath, type StepId } from './steps';
import { BenefitsStep } from './steps/BenefitsStep';
import { ChildrenStep } from './steps/ChildrenStep';
import { CouncilStep } from './steps/CouncilStep';
import { FinancesStep } from './steps/FinancesStep';
import { HistoryStep } from './steps/HistoryStep';
import { ResultContinuation, ResultStep } from './steps/ResultStep';
import { WhereStep } from './steps/WhereStep';
import { useChildFocus, useStepFocus, type PendingChildFocus } from './useStepFocus';

export function CalculatorShell() {
  const [form, setForm] = useState<CalculatorForm>(emptyForm);
  const [step, setStep] = useState<StepId>('where');
  const [maxStepReached, setMaxStepReached] = useState<StepId>('where');
  const [wantsMeansTest, setWantsMeansTest] = useState(false);

  const [issues, setIssues] = useState<FormIssue[]>([]);
  const [engineError, setEngineError] = useState<EngineErrorKind | null>(null);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [resultInput, setResultInput] = useState<CalculatorInput | null>(null);

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const addChildRef = useRef<HTMLButtonElement>(null);

  const [pendingChildFocus, setPendingChildFocus] = useState<PendingChildFocus | null>(null);
  const clearPendingChildFocus = useCallback(() => setPendingChildFocus(null), []);

  // ── Calculating ─────────────────────────────────────────────────────────

  /**
   * Returns whether the calculation succeeded, so callers can decline to move
   * on. Advancing past a step whose field is wrong leaves the message on a
   * screen the person has just left, which is how "it shows nothing" happens.
   */
  const runWith = useCallback((current: CalculatorForm, withFinances: boolean): boolean => {
    setIssues([]);
    setEngineError(null);
    const built = buildInput(current, withFinances);
    try {
      setResult(calculate(built));
      setResultInput(built);
      return true;
    } catch (e) {
      setResult(null);
      setResultInput(null);
      if (e instanceof ValidationError) {
        setIssues(e.issues.length > 0 ? [...e.issues] : [{ path: '', message: e.message }]);
        queueMicrotask(() => errorSummaryRef.current?.focus());
      } else if (e instanceof GuardrailViolation) {
        // [§15 UI contract] Never show the raw error. Log the rule code only:
        // no user data, and render the fallback.
        console.error(`GuardrailViolation: ${e.rule}`);
        setEngineError('guardrail');
      } else if (e instanceof DataError) {
        setEngineError('data');
      } else {
        setEngineError('data');
      }
      return false;
    }
  }, []);

  const run = useCallback(
    (withFinances: boolean): boolean => runWith(form, withFinances),
    [form, runWith],
  );

  const goTo = useCallback((next: StepId): void => {
    setStep(next);
    setMaxStepReached((prev) => (isAfter(next, prev) ? next : prev));
  }, []);

  // ── Restoring the shareable part of the answers from the URL ────────────

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const shared = fromQueryString(window.location.search);
    const restored: CalculatorForm = { ...emptyForm() };
    if (shared.nation) restored.nation = shared.nation;
    if (shared.region) restored.region = shared.region;
    if (shared.la) restored.la = shared.la;
    if (shared.formerFosterCarer) restored.wasFosterCarer = true;
    if (shared.ages?.length) {
      const disability = new Set(shared.disability ?? []);
      restored.children = shared.ages.map((age, i) => ({
        ...emptyChild(),
        ageYears: String(age),
        hasDisabilityOrAdditionalNeeds: disability.has(i),
      }));
      restored.householdChildren = String(shared.ages.length);
    }
    setForm(restored);

    // Someone opening a shared link expects to see the figure, not a blank form
    // with their answers quietly pre-filled. Only jump to the result when the
    // link carries enough to actually calculate one; otherwise leave them at
    // the start, where the missing answer is asked for.
    //
    // Calculated from `restored` rather than from state, because the state set
    // above is not yet visible on this render and the calculation would run
    // against an empty form.
    const enough =
      Boolean(shared.ages?.length) &&
      Boolean(shared.nation) &&
      (shared.nation !== 'england' || Boolean(shared.region) || Boolean(shared.la));
    if (enough && runWith(restored, false)) goTo('result');
  }, [runWith, goTo]);

  // [§20] Auto-mark the eldest by age. Only the eldest attracts the higher
  // Child Benefit rate, so getting it wrong shifts the figure. The carer's own
  // choice always wins, which is what eldestOverridden records.
  useEffect(() => {
    setForm((f) => {
      if (f.eldestOverridden) return f;
      const best = indexOfOldest(f.children);
      return f.eldestIndex === best ? f : { ...f, eldestIndex: best };
    });
  }, [form.children, form.eldestOverridden]);

  useStepFocus({ step, hasResult: Boolean(result), headingRef: stepHeadingRef, resultsRef });
  useChildFocus({ pending: pendingChildFocus, onHandled: clearPendingChildFocus, addChildRef });

  // ── Deriving what the steps need ────────────────────────────────────────

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const qs = toQueryString(shareableState(form));
    return `${window.location.origin}${window.location.pathname}${qs}`;
  }, [form]);

  const errorFor = useCallback(
    (path: string): string | undefined => issues.find((e) => e.path === path)?.message,
    [issues],
  );

  const elsewhere = issues.filter((e) => stepForPath(e.path) !== step);

  const stepProps = { form, set: setForm, errorFor, headingRef: stepHeadingRef, goTo, run };

  return (
    <div>
      <ErrorSummary issues={elsewhere} summaryRef={errorSummaryRef} />
      {engineError && <EngineErrorFallback kind={engineError} />}

      <div className="calculator-form">
        {step === 'where' && <WhereStep {...stepProps} />}
        {step === 'children' && (
          <ChildrenStep
            {...stepProps}
            addChildRef={addChildRef}
            onChildAdded={(key) => setPendingChildFocus({ kind: 'added', key })}
            onChildRemoved={(key) => setPendingChildFocus({ kind: 'removed', key })}
          />
        )}
        {step === 'result' && <ResultStep {...stepProps} />}
        {step === 'history' && <HistoryStep {...stepProps} />}
        {step === 'benefits' && <BenefitsStep {...stepProps} />}
        {step === 'finances' && FLAGS.MEANS_TEST_ENABLED && (
          <FinancesStep {...stepProps} onWantsMeansTest={setWantsMeansTest} />
        )}
        {step === 'council' && <CouncilStep {...stepProps} wantsMeansTest={wantsMeansTest} />}
      </div>

      {result && resultInput && !engineError && (
        <div aria-live="polite" ref={resultsRef}>
          <ResultsPanel
            result={result}
            input={resultInput}
            regionLabel={form.region || undefined}
            councilName={form.la ? LA_NAMES[form.la] : undefined}
            shareUrl={shareUrl}
            // Only on the interstitial. Once the carer has gone on through the
            // later steps there is nothing to invite them to.
            continuation={step === 'result' ? <ResultContinuation goTo={goTo} /> : undefined}
          />
        </div>
      )}

      {result && step !== 'result' && <p className="print-hide muted">{SHARE_EXPLANATION}</p>}

      {maxStepReached !== 'where' && (
        <p className="print-hide muted">
          Nothing you have typed has been sent anywhere, and nothing has been saved. If you refresh
          this page, you will start again.
        </p>
      )}
    </div>
  );
}
