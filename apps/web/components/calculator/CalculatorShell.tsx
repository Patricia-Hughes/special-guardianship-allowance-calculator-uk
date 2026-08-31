'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FLAGS,
  GuardrailViolation,
  DataError,
  ValidationError,
  calculate,
  LA_NAMES,
  type CalculatorInput,
  type CalculatorResult,
  type EnglandRegion,
  type FinancesInput,
  type MeansTestedBenefit,
  type Nation,
  type Pence,
} from '@sgo/engine';
import { CouncilPicker } from './CouncilPicker';
import { MoneyInput } from './MoneyInput';
import { ResultsPanel } from '../results/ResultsPanel';
import { fromQueryString, toQueryString, SHARE_EXPLANATION } from '../../lib/urlState';
import { scrollToElementAfterPaint } from '../../lib/scrollTo';

/**
 * Step orchestration, spec §20. Six steps, progressive.
 *
 * The rule that shapes everything here: NEVER ask for finances before showing
 * the maximum. The interstitial result after step 2 is the number most users
 * came for, and it must not be gated behind a means test they may not want to
 * complete.
 *
 * No localStorage or sessionStorage for anything (§22). A shared or family
 * computer is the normal case for this audience.
 */

type StepId = 'where' | 'children' | 'result' | 'history' | 'benefits' | 'finances' | 'council';

interface ChildForm {
  /**
   * Identity that survives reordering. Keying the list by array index makes
   * React match the wrong row to the wrong DOM node when a child in the middle
   * is removed, and the symptom is someone's answers appearing to jump between
   * children or vanish. Nothing in the answer decides the key.
   */
  key: string;
  ageYears: string;
  hasDisabilityOrAdditionalNeeds: boolean;
  wasLookedAfterImmediatelyBeforeOrder: 'yes' | 'no' | 'unknown';
}

/** Sentinel: land on Add another child, because nothing sits above the gap. */
const FOCUS_ADD_BUTTON = '__add-child-button__';

let childKeySeq = 0;
const emptyChild = (): ChildForm => ({
  key: `child-${(childKeySeq += 1)}`,
  ageYears: '',
  hasDisabilityOrAdditionalNeeds: false,
  wasLookedAfterImmediatelyBeforeOrder: 'unknown',
});

const MEANS_TESTED_BENEFITS: Array<{ id: MeansTestedBenefit; label: string }> = [
  { id: 'universal-credit', label: 'Universal Credit' },
  { id: 'income-support', label: 'Income Support' },
  { id: 'jsa-income-based', label: 'Jobseeker’s Allowance (income-based)' },
  { id: 'esa-income-related', label: 'Employment and Support Allowance (income-related)' },
  { id: 'pension-credit', label: 'Pension Credit' },
  { id: 'housing-benefit', label: 'Housing Benefit' },
  { id: 'council-tax-support', label: 'Council Tax Support' },
];

const MONEY_FIELDS = [
  ['netEarnings', 'Take-home pay, per month', 'After tax and National Insurance. Include your partner’s.'],
  ['otherIncome', 'Other income, per month', 'Pensions, maintenance you receive, money from a lodger.'],
  ['countableBenefits', 'Benefits that count, per month', 'Do NOT include disability benefits for your child, or Guardian’s Allowance.'],
  ['childBenefitOtherChildren', 'Child Benefit for your OTHER children, per month', 'Not for the child this is about.'],
  ['housingCosts', 'Rent or mortgage, per month', 'After any Housing Benefit.'],
  ['councilTax', 'Council tax, per month', 'After any Council Tax Support.'],
  ['childcareCosts', 'Childcare, per month', ''],
  ['essentialLoanRepayments', 'Essential loan repayments, per month', ''],
  ['maintenancePaid', 'Maintenance you pay out, per month', ''],
  ['pensionContributions', 'Pension contributions, per month', ''],
  ['savingsCapital', 'Savings, in total', 'Not monthly, the total you have.'],
] as const;

type MoneyFieldName = (typeof MONEY_FIELDS)[number][0];

/**
 * A whole number from a text box, or NaN so the schema can object.
 *
 * `Number.parseInt(raw, 10) || fallback` looks equivalent and is not: 0 is
 * falsy, so someone who deliberately typed 0 had it silently replaced by the
 * fallback and never validated. The form would then accept an answer the person
 * had not given. Refusing is the house rule everywhere else here, so it applies
 * to a zero as much as to a word.
 */
const wholeNumber = (raw: string, blank: number): number => {
  if (raw.trim() === '') return blank;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isInteger(n) ? n : Number.NaN;
};

export function CalculatorShell() {
  const [step, setStep] = useState<StepId>('where');
  const [maxStepReached, setMaxStepReached] = useState<StepId>('where');

  const [nation, setNation] = useState<Nation | ''>('');
  const [region, setRegion] = useState<EnglandRegion | ''>('');
  const [la, setLa] = useState('');
  const [children, setChildren] = useState<ChildForm[]>([emptyChild()]);
  const [eldestIndex, setEldestIndex] = useState(0);
  // The carer can override which child is the eldest; until they do, we work it
  // out from the ages they entered.
  const [eldestOverridden, setEldestOverridden] = useState(false);

  const [wasFosterCarer, setWasFosterCarer] = useState(false);
  const [previousAllowance, setPreviousAllowance] = useState<{ raw: string; pence: number | null }>({
    raw: '',
    pence: null,
  });
  const [orderDate, setOrderDate] = useState('');
  const [monthsSinceOrder, setMonthsSinceOrder] = useState('');

  const [onMeansTestedBenefits, setOnMeansTestedBenefits] = useState(false);
  const [benefitsHeld, setBenefitsHeld] = useState<MeansTestedBenefit[]>([]);

  const [money, setMoney] = useState<Record<MoneyFieldName, { raw: string; pence: number | null }>>(
    () =>
      Object.fromEntries(MONEY_FIELDS.map(([n]) => [n, { raw: '', pence: 0 }])) as Record<
        MoneyFieldName,
        { raw: string; pence: number | null }
      >,
  );
  const [adults, setAdults] = useState('1');
  const [householdChildren, setHouseholdChildren] = useState('1');
  const [wantsMeansTest, setWantsMeansTest] = useState(false);

  const [childWouldOtherwiseBeInCare, setChildWouldOtherwiseBeInCare] = useState(false);
  const [alreadyOnReg6, setAlreadyOnReg6] = useState(false);
  const [applyChildBenefitDeduction, setApplyChildBenefitDeduction] = useState(false);

  const [errors, setErrors] = useState<Array<{ path: string; message: string }>>([]);
  const [engineError, setEngineError] = useState<'guardrail' | 'data' | null>(null);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [resultInput, setResultInput] = useState<CalculatorInput | null>(null);

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const hydratedFromUrl = useRef(false);
  const [pendingSharedResult, setPendingSharedResult] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const addChildRef = useRef<HTMLButtonElement>(null);
  /** Key of a child row just added, so the effect can move focus into it. */
  const [childFocusKey, setChildFocusKey] = useState<string | null>(null);
  /**
   * Key of the child to land on after a removal: the one above the gap. Set to
   * FOCUS_ADD_BUTTON when the first child goes and there is nothing above it.
   * An empty string will not do as that sentinel: it is falsy, so the effect
   * skips it and focus is lost to the document body.
   */
  const [childRemovedFocusKey, setChildRemovedFocusKey] = useState<string | null>(null);

  // ── Restore the shareable (non-sensitive) part of the state from the URL ──
  useEffect(() => {
    if (hydratedFromUrl.current) return;
    hydratedFromUrl.current = true;
    const s = fromQueryString(window.location.search);
    if (s.nation) setNation(s.nation);
    if (s.region) setRegion(s.region);
    if (s.la) setLa(s.la);
    if (s.ages?.length) {
      const disability = new Set(s.disability ?? []);
      setChildren(
        s.ages.map((age, i) => ({
          ...emptyChild(),
          ageYears: String(age),
          hasDisabilityOrAdditionalNeeds: disability.has(i),
          wasLookedAfterImmediatelyBeforeOrder: 'unknown' as const,
        })),
      );
      setHouseholdChildren(String(s.ages.length));
    }
    if (s.formerFosterCarer) setWasFosterCarer(true);

    // Someone opening a shared link expects to see the figure, not a blank form
    // with their answers quietly pre-filled. Only jump to the result when the
    // link carries enough to actually calculate one; otherwise leave them at
    // the start, where the missing answer is asked for.
    const enough =
      Boolean(s.ages?.length) &&
      Boolean(s.nation) &&
      (s.nation !== 'england' || Boolean(s.region) || Boolean(s.la));
    if (enough) setPendingSharedResult(true);
  }, []);

  // Runs on the tick after the URL state has been applied, so the calculation
  // sees the restored answers rather than the empty ones it replaced.
  useEffect(() => {
    if (!pendingSharedResult) return;
    setPendingSharedResult(false);
    run(false);
    goTo('result');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSharedResult]);

  // [§20] Auto-mark the eldest by age. Only the eldest attracts the higher
  // Child Benefit rate, so getting it wrong shifts the figure. But the carer
  // knows their household better than we do, so an explicit choice always wins.
  useEffect(() => {
    if (eldestOverridden) return;
    let best = 0;
    let bestAge = -1;
    children.forEach((c, i) => {
      const age = Number.parseInt(c.ageYears, 10);
      if (Number.isInteger(age) && age > bestAge) {
        bestAge = age;
        best = i;
      }
    });
    setEldestIndex((prev) => (prev === best ? prev : best));
  }, [children, eldestOverridden]);

  // Results are announced on render (§24). Take the person to the step as well
  // as focusing it: on a phone the next question is usually below the fold, and
  // a form that changes somewhere you are not looking reads as a form that did
  // nothing.
  useEffect(() => {
    if (step === 'where') return;
    const heading = stepHeadingRef.current;

    // On the result step these two want different places: the heading says
    // "Your result", the figure itself renders below the whole form. Scrolling
    // to both meant they raced, and on a short screen the figure lost. The
    // figure wins, and focus still goes to the heading so a screen reader
    // announces the step rather than jumping into the middle of the answer.
    if (step === 'result' && result) {
      try {
        heading?.focus({ preventScroll: true });
      } catch {
        heading?.focus();
      }
      scrollToElementAfterPaint(() => resultsRef.current);
      return;
    }

    scrollToElementAfterPaint(() => heading, { focus: true });
  }, [step, result]);

  // Adding a child appends a row below the fold; removing one collapses the
  // list under you and, if focus was on the button that has just gone, strands
  // a keyboard user on nothing. Both cases move the person somewhere sensible.
  useEffect(() => {
    if (!childFocusKey) return;
    const key = childFocusKey;
    setChildFocusKey(null);
    scrollToElementAfterPaint(
      () => document.querySelector<HTMLElement>(`[data-child-key="${key}"] input`),
      { focus: true },
    );
  }, [childFocusKey]);

  useEffect(() => {
    if (!childRemovedFocusKey) return;
    const key = childRemovedFocusKey;
    setChildRemovedFocusKey(null);
    // Land on the child above the one just removed, which is where the eye
    // already is. Removing the first child leaves nothing above it, so fall
    // back to Add another child rather than dropping focus on the document.
    scrollToElementAfterPaint(
      () =>
        document.querySelector<HTMLElement>(`[data-child-key="${key}"] input`) ??
        addChildRef.current,
      { focus: true },
    );
  }, [childRemovedFocusKey]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const ages = children.map((c) => Number.parseInt(c.ageYears, 10)).filter(Number.isInteger);
    const disability = children
      .map((c, i) => (c.hasDisabilityOrAdditionalNeeds ? i : -1))
      .filter((i) => i >= 0);
    const qs = toQueryString({
      ...(nation ? { nation } : {}),
      ...(region ? { region } : {}),
      ...(la ? { la } : {}),
      ...(ages.length ? { ages } : {}),
      ...(disability.length ? { disability } : {}),
      ...(wasFosterCarer ? { formerFosterCarer: true } : {}),
    });
    return `${window.location.origin}${window.location.pathname}${qs}`;
  }, [nation, region, la, children, wasFosterCarer]);

  const buildInput = useCallback(
    (withFinances: boolean): CalculatorInput => {
      const finances: FinancesInput | undefined = withFinances
        ? ({
            netEarnings: (money.netEarnings.pence ?? 0) as Pence,
            otherIncome: (money.otherIncome.pence ?? 0) as Pence,
            countableBenefits: (money.countableBenefits.pence ?? 0) as Pence,
            childBenefitOtherChildren: (money.childBenefitOtherChildren.pence ?? 0) as Pence,
            savingsCapital: (money.savingsCapital.pence ?? 0) as Pence,
            housingCosts: (money.housingCosts.pence ?? 0) as Pence,
            councilTax: (money.councilTax.pence ?? 0) as Pence,
            childcareCosts: (money.childcareCosts.pence ?? 0) as Pence,
            essentialLoanRepayments: (money.essentialLoanRepayments.pence ?? 0) as Pence,
            maintenancePaid: (money.maintenancePaid.pence ?? 0) as Pence,
            pensionContributions: (money.pensionContributions.pence ?? 0) as Pence,
            adultsInHousehold: wholeNumber(adults, 1),
            dependentChildrenInHousehold: wholeNumber(householdChildren, children.length),
          } as FinancesInput)
        : undefined;

      return {
        carer: {
          nation: (nation || 'england') as Nation,
          ...(region ? { englandRegion: region } : {}),
          ...(la ? { localAuthoritySlug: la } : {}),
          wasFosterCarerForThisChild: wasFosterCarer,
          ...(orderDate ? { orderDate: orderDate as CalculatorInput['asAtDate'] } : {}),
          monthsSinceOrderMade: wholeNumber(monthsSinceOrder, 0),
          ...(wasFosterCarer && previousAllowance.pence !== null
            ? { previousWeeklyFosteringAllowance: previousAllowance.pence as Pence }
            : {}),
          onMeansTestedBenefits,
          ...(benefitsHeld.length ? { meansTestedBenefitsHeld: benefitsHeld } : {}),
          ...(childWouldOtherwiseBeInCare ? { childWouldOtherwiseBeInCare: true } : {}),
          ...(alreadyOnReg6 ? { alreadyReceivingReg6Support: true } : {}),
        },
        children: children.map((c, i) => ({
          id: `child-${i}`,
          ageYears: Number.parseInt(c.ageYears, 10),
          hasDisabilityOrAdditionalNeeds: c.hasDisabilityOrAdditionalNeeds,
          wasLookedAfterImmediatelyBeforeOrder:
            c.wasLookedAfterImmediatelyBeforeOrder === 'unknown'
              ? ('unknown' as const)
              : c.wasLookedAfterImmediatelyBeforeOrder === 'yes',
          isEldestInHousehold: i === eldestIndex,
        })),
        ...(finances ? { finances } : {}),
        applyChildBenefitDeduction,
      };
    },
    [
      nation, region, la, children, eldestIndex, wasFosterCarer, previousAllowance, orderDate,
      monthsSinceOrder, onMeansTestedBenefits, benefitsHeld, money, adults, householdChildren,
      childWouldOtherwiseBeInCare, alreadyOnReg6, applyChildBenefitDeduction,
    ],
  );

  /**
   * Returns whether the calculation succeeded, so callers can decline to move
   * on. Advancing past a step whose field is wrong leaves the message on a
   * screen the person has just left, which is how "it shows nothing" happens.
   */
  const run = useCallback(
    (withFinances: boolean): boolean => {
      setErrors([]);
      setEngineError(null);
      const built = buildInput(withFinances);
      try {
        setResult(calculate(built));
        setResultInput(built);
        return true;
      } catch (e) {
        setResult(null);
        setResultInput(null);
        if (e instanceof ValidationError) {
          setErrors(e.issues.length > 0 ? [...e.issues] : [{ path: '', message: e.message }]);
          queueMicrotask(() => errorSummaryRef.current?.focus());
        } else if (e instanceof GuardrailViolation) {
          // [§15 UI contract] Never show the raw error. Log the rule code only —
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
    },
    [buildInput],
  );

  /** The message for one field, for showing beside it rather than only at the top. */
  const errorFor = (path: string): string | undefined =>
    errors.find((e) => e.path === path)?.message;

  /**
   * Errors with no box on the current step to sit beside. Only these reach the
   * summary, so nothing is said twice and nothing goes unsaid either.
   */
  const elsewhereErrors = errors.filter((e) => stepForPath(e.path) !== step);

  const goTo = (next: StepId): void => {
    setStep(next);
    setMaxStepReached((prev) => (ORDER.indexOf(next) > ORDER.indexOf(prev) ? next : prev));
  };

  const showInterstitial = (): void => {
    if (run(false)) goTo('result');
  };

  return (
    <div>
      {elsewhereErrors.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          className="callout callout--critical"
          aria-labelledby="error-summary-heading"
        >
          <h2 id="error-summary-heading" style={{ marginTop: 0, fontSize: '1.15rem' }}>
            There is a problem
          </h2>
          <ul style={{ margin: 0 }}>
            {elsewhereErrors.map((e, i) => {
              const target = FIELD_ANCHORS[e.path];
              return (
                <li key={i}>
                  {target ? <a href={`#${target}`}>{e.message}</a> : e.message}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {engineError && <EngineErrorFallback kind={engineError} />}

      <div className="calculator-form">
        {step === 'where' && (
          <StepPanel heading="Where do you live?" headingRef={stepHeadingRef} stepNumber={1}>
            <fieldset>
              <legend>Which nation?</legend>
              {(
                [
                  ['england', 'England'],
                  ['wales', 'Wales'],
                  ['scotland', 'Scotland'],
                  ['northern-ireland', 'Northern Ireland'],
                ] as Array<[Nation, string]>
              ).map(([id, label]) => (
                <label className="choice" key={id}>
                  <input
                    type="radio"
                    name="nation"
                    value={id}
                    checked={nation === id}
                    onChange={() => {
                      setNation(id);
                      if (id !== 'england') {
                        setRegion('');
                        setLa('');
                      }
                    }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>

            {nation === 'wales' && !FLAGS.WALES_ROUTE_ENABLED && (
              <div className="callout callout--important" role="note" aria-label="Important">
                <p style={{ margin: 0 }}>
                  <strong>We are not showing Welsh figures yet.</strong> We are checking the Welsh
                  rates against the Welsh Government&apos;s own published table before we publish
                  them, one of the age bands in the sources we have looks wrong, and a wrong figure
                  here is worse than none. The rest of this guide still applies in Wales.
                </p>
              </div>
            )}

            {nation === 'england' && (
              <>
                <CouncilPicker
                  value={la}
                  postcodeLookupEnabled={FLAGS.POSTCODE_LOOKUP}
                  onChange={(slug, r) => {
                    setLa(slug);
                    if (r) setRegion(r);
                  }}
                />
                <fieldset id="region-fieldset">
                  <legend>Or choose your region</legend>
                  <FieldError id="region-error" message={errorFor('carer.englandRegion')} />
                  <span className="field__hint">
                    Rates are higher in London and the South East. If you picked a council above,
                    we have already filled this in.
                  </span>
                  {(
                    [
                      ['london', 'London, the 32 boroughs and the City of London'],
                      ['south-east', 'South East England'],
                      ['rest-of-england', 'Anywhere else in England'],
                    ] as Array<[EnglandRegion, string]>
                  ).map(([id, label]) => (
                    <label className="choice" key={id}>
                      <input
                        type="radio"
                        name="region"
                        value={id}
                        checked={region === id}
                        onChange={() => setRegion(id)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                  {/*
                    The government publishes rates by region but no list of
                    which council is in which region, so the mapping above is
                    ours, not theirs. Saying so is both honest and practical:
                    it pre-empts the complaint from a carer near a boundary,
                    and it tells them the fix is the radio buttons they are
                    already looking at.
                  */}
                  <p className="field__hint">
                    The government publishes rates by region but does not publish a list of which
                    council is in which region. We use the standard national regions. If you think
                    yours is wrong, choose it here, your choice overrides ours.
                  </p>
                </fieldset>
              </>
            )}

            <Nav
              onNext={() => goTo('children')}
              nextDisabled={!nation || (nation === 'england' && !region && !la)}
            />
          </StepPanel>
        )}

        {step === 'children' && (
          <StepPanel heading="About the children" headingRef={stepHeadingRef} stepNumber={2}>
            {/* Errors about the list itself rather than one child in it. */}
            <FieldError id="children-error" message={errorFor('children')} />
            {children.map((c, i) => (
              <fieldset
                key={c.key}
                data-child-key={c.key}
                style={{
                  border: '2px solid var(--colour-line)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <legend>Child {i + 1}</legend>
                <div className="field">
                  <label className="field__label" htmlFor={`age-${i}`}>
                    How old are they?
                  </label>
                  <span className="field__hint" id={`age-hint-${i}`}>
                    In years, from 0 to 17.
                  </span>
                  {/*
                    The message goes next to the box as well as in the summary
                    at the top. Someone who types 80 and presses the button is
                    looking at the box, not the top of the page.
                  */}
                  {errorFor(`children.${i}.ageYears`) && (
                    <span className="field__error" id={`age-error-${i}`} role="alert">
                      {errorFor(`children.${i}.ageYears`)}
                    </span>
                  )}
                  <input
                    id={`age-${i}`}
                    type="text"
                    inputMode="numeric"
                    value={c.ageYears}
                    aria-invalid={errorFor(`children.${i}.ageYears`) ? true : undefined}
                    aria-describedby={
                      errorFor(`children.${i}.ageYears`)
                        ? `age-hint-${i} age-error-${i}`
                        : `age-hint-${i}`
                    }
                    onChange={(e) =>
                      setChildren((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, ageYears: e.target.value } : x)),
                      )
                    }
                  />
                </div>

                <label className="choice">
                  <input
                    type="checkbox"
                    checked={c.hasDisabilityOrAdditionalNeeds}
                    onChange={(e) =>
                      setChildren((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, hasDisabilityOrAdditionalNeeds: e.target.checked } : x,
                        ),
                      )
                    }
                  />
                  <span>They have a disability or additional needs</span>
                </label>

                <fieldset>
                  <legend>
                    Were they in the council&apos;s care immediately before the order was made?
                  </legend>
                  {(['yes', 'no', 'unknown'] as const).map((v) => (
                    <label className="choice" key={v}>
                      <input
                        type="radio"
                        name={`looked-after-${i}`}
                        checked={c.wasLookedAfterImmediatelyBeforeOrder === v}
                        onChange={() =>
                          setChildren((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, wasLookedAfterImmediatelyBeforeOrder: v } : x,
                            ),
                          )
                        }
                      />
                      <span>{v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'I’m not sure'}</span>
                    </label>
                  ))}
                </fieldset>

                {children.length > 1 && (
                  <>
                    <label className="choice">
                      <input
                        type="radio"
                        name="eldest"
                        checked={eldestIndex === i}
                        onChange={() => {
                          setEldestIndex(i);
                          setEldestOverridden(true);
                        }}
                      />
                      <span>This is the eldest child in the household</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => {
                        setChildRemovedFocusKey(children[i - 1]?.key ?? FOCUS_ADD_BUTTON);
                        setChildren((prev) => prev.filter((_, j) => j !== i));
                        setEldestOverridden(false);
                      }}
                    >
                      Remove child {i + 1}
                    </button>
                  </>
                )}
              </fieldset>
            ))}

            {children.length < 10 && (
              <button
                type="button"
                className="btn btn--secondary"
                ref={addChildRef}
                onClick={() =>
                  setChildren((prev) => {
                    const next = emptyChild();
                    setChildFocusKey(next.key);
                    return [...prev, next];
                  })
                }
              >
                Add another child
              </button>
            )}

            <Nav onBack={() => goTo('where')} onNext={showInterstitial} nextLabel="Show me the figure" />
          </StepPanel>
        )}

        {step === 'result' && (
          <StepPanel heading="Your result" headingRef={stepHeadingRef}>
            <p>
              This is the figure most people come here for. You do not have to answer anything else.
            </p>
            <Nav
              onBack={() => goTo('children')}
              onNext={() => goTo('history')}
              nextLabel="Answer a few more questions"
              nextSecondary
            />
          </StepPanel>
        )}

        {step === 'history' && (
          <StepPanel heading="Your history with this child" headingRef={stepHeadingRef} stepNumber={3}>
            <label className="choice">
              <input
                type="checkbox"
                checked={wasFosterCarer}
                onChange={(e) => setWasFosterCarer(e.target.checked)}
              />
              <span>I was this child&apos;s foster carer before the order was made</span>
            </label>

            {wasFosterCarer && (
              <>
                <MoneyInput
                  label="What were you paid as a foster carer, per week?"
                  hint="Including the reward or fee element. This protects your figure for two years."
                  name="previousWeeklyFosteringAllowance"
                  required
                  value={previousAllowance.raw}
                  error={errorFor('carer.previousWeeklyFosteringAllowance')}
                  onChange={(raw, p) => setPreviousAllowance({ raw, pence: p })}
                />
                <div className="field">
                  <label className="field__label" htmlFor="order-date">
                    When was the special guardianship order made?
                  </label>
                  <span className="field__hint" id="order-date-hint">
                    If you are not sure of the exact day, the month is close enough.
                  </span>
                  <FieldError id="order-date-error" message={errorFor('carer.orderDate')} />
                  <input
                    id="order-date"
                    type="date"
                    value={orderDate}
                    aria-invalid={errorFor('carer.orderDate') ? true : undefined}
                    aria-describedby={
                      errorFor('carer.orderDate')
                        ? 'order-date-hint order-date-error'
                        : 'order-date-hint'
                    }
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="field">
              <label className="field__label" htmlFor="months-since">
                Roughly how many months ago was the order made?
              </label>
              <span className="field__hint" id="months-since-hint">
                Leave blank if you gave the date above.
              </span>
              <FieldError
                id="months-since-error"
                message={
                  errorFor('carer.monthsSinceOrderMade') ??
                  errorFor('carer.previousWeeklyFosteringAllowance')
                }
              />
              <input
                id="months-since"
                type="text"
                inputMode="numeric"
                value={monthsSinceOrder}
                aria-invalid={errorFor('carer.monthsSinceOrderMade') ? true : undefined}
                aria-describedby={
                  errorFor('carer.monthsSinceOrderMade')
                    ? 'months-since-hint months-since-error'
                    : 'months-since-hint'
                }
                onChange={(e) => setMonthsSinceOrder(e.target.value)}
              />
            </div>

            <Nav onBack={() => goTo('result')} onNext={() => { if (run(false)) goTo('benefits'); }} />
          </StepPanel>
        )}

        {step === 'benefits' && (
          <StepPanel heading="Benefits you receive" headingRef={stepHeadingRef} stepNumber={4}>
            <p>
              This does not change your figure. It tells us which rules about your council&apos;s
              behaviour apply to you.
            </p>
            <label className="choice">
              <input
                type="checkbox"
                checked={onMeansTestedBenefits}
                onChange={(e) => setOnMeansTestedBenefits(e.target.checked)}
              />
              <span>I receive at least one means-tested benefit</span>
            </label>

            {onMeansTestedBenefits && (
              <fieldset>
                <legend>Which ones? (optional)</legend>
                {MEANS_TESTED_BENEFITS.map((b) => (
                  <label className="choice" key={b.id}>
                    <input
                      type="checkbox"
                      checked={benefitsHeld.includes(b.id)}
                      onChange={(e) =>
                        setBenefitsHeld((prev) =>
                          e.target.checked ? [...prev, b.id] : prev.filter((x) => x !== b.id),
                        )
                      }
                    />
                    <span>{b.label}</span>
                  </label>
                ))}
              </fieldset>
            )}

            <Nav
              onBack={() => goTo('history')}
              onNext={() => { if (run(false)) goTo(FLAGS.MEANS_TEST_ENABLED ? 'finances' : 'council'); }}
            />
          </StepPanel>
        )}

        {step === 'finances' && FLAGS.MEANS_TEST_ENABLED && (
          <StepPanel heading="Your finances" headingRef={stepHeadingRef} stepNumber={5}>
            <div className="callout" role="note" aria-label="Note">
              <p style={{ margin: 0 }}>
                <strong>You can skip this.</strong> Fill it in only if you want an estimate of what
                you might get after a means test. Nothing you type here leaves your browser, there
                is no server to send it to.
              </p>
            </div>

            {MONEY_FIELDS.map(([name, label, hint]) => (
              <MoneyInput
                key={name}
                name={name}
                label={label}
                {...(hint ? { hint } : {})}
                value={money[name].raw}
                error={errorFor(`finances.${name}`)}
                onChange={(raw, p) => setMoney((prev) => ({ ...prev, [name]: { raw, pence: p } }))}
              />
            ))}

            <div className="field">
              <label className="field__label" htmlFor="adults">
                How many adults live in your household?
              </label>
              <FieldError id="adults-error" message={errorFor('finances.adultsInHousehold')} />
              <input
                id="adults"
                type="text"
                inputMode="numeric"
                value={adults}
                aria-invalid={errorFor('finances.adultsInHousehold') ? true : undefined}
                aria-describedby={errorFor('finances.adultsInHousehold') ? 'adults-error' : undefined}
                onChange={(e) => setAdults(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="household-children">
                How many dependent children live in your household?
              </label>
              <span className="field__hint" id="household-children-hint">
                Include the children you have already told us about.
              </span>
              <FieldError
                id="household-children-error"
                message={errorFor('finances.dependentChildrenInHousehold')}
              />
              <input
                id="household-children"
                type="text"
                inputMode="numeric"
                value={householdChildren}
                aria-invalid={errorFor('finances.dependentChildrenInHousehold') ? true : undefined}
                aria-describedby={
                  errorFor('finances.dependentChildrenInHousehold')
                    ? 'household-children-hint household-children-error'
                    : 'household-children-hint'
                }
                onChange={(e) => setHouseholdChildren(e.target.value)}
              />
            </div>

            <Nav
              onBack={() => goTo('benefits')}
              onNext={() => { setWantsMeansTest(true); if (run(true)) goTo('council'); }}
              onSkip={() => { setWantsMeansTest(false); goTo('council'); }}
            />
          </StepPanel>
        )}

        {step === 'council' && (
          <StepPanel
            heading="How your council behaves"
            headingRef={stepHeadingRef}
            stepNumber={FLAGS.MEANS_TEST_ENABLED ? 6 : 5}
          >
            <p>
              If you know any of this, it makes the guidance more useful. If you do not, leave it
              blank and the result will tell you how to find out.
            </p>

            <label className="choice">
              <input
                type="checkbox"
                checked={applyChildBenefitDeduction}
                onChange={(e) => setApplyChildBenefitDeduction(e.target.checked)}
              />
              <span>My council takes Child Benefit off my allowance</span>
            </label>
            <p className="field__hint">
              We never do this unless you tick it. Whether a council may do it at all is contested,
              and it has been found wrong where the carer is on means-tested benefits.
            </p>

            <label className="choice">
              <input
                type="checkbox"
                checked={childWouldOtherwiseBeInCare}
                onChange={(e) => setChildWouldOtherwiseBeInCare(e.target.checked)}
              />
              <span>Without me, this child would be in local authority care</span>
            </label>

            <label className="choice">
              <input
                type="checkbox"
                checked={alreadyOnReg6}
                onChange={(e) => setAlreadyOnReg6(e.target.checked)}
              />
              <span>I already receive special guardianship financial support from my council</span>
            </label>

            <Nav
              onBack={() => goTo(FLAGS.MEANS_TEST_ENABLED ? 'finances' : 'benefits')}
              onNext={() => { if (run(wantsMeansTest && FLAGS.MEANS_TEST_ENABLED)) goTo('result'); }}
              nextLabel="Update my result"
            />
          </StepPanel>
        )}
      </div>

      {result && resultInput && !engineError && (
        <div aria-live="polite" ref={resultsRef}>
          <ResultsPanel
            result={result}
            input={resultInput}
            regionLabel={region || undefined}
            councilName={la ? LA_NAMES[la] : undefined}
            shareUrl={shareUrl}
          />
        </div>
      )}

      {result && step !== 'result' && (
        <p className="print-hide" style={{ color: 'var(--colour-text-muted)' }}>
          {SHARE_EXPLANATION}
        </p>
      )}

      {maxStepReached !== 'where' && (
        <p className="print-hide" style={{ color: 'var(--colour-text-muted)' }}>
          Nothing you have typed has been sent anywhere, and nothing has been saved. If you refresh
          this page, you will start again.
        </p>
      )}
    </div>
  );
}

const ORDER: StepId[] = ['where', 'children', 'result', 'history', 'benefits', 'finances', 'council'];

/**
 * [§24] The error summary links to the field that failed. A list of messages
 * with no way to reach the input is close to useless to a screen-reader or
 * keyboard user on a six-step form.
 *
 * Keys are the Zod issue paths from the shared schema; children.N.field paths
 * are normalised to the repeated field's id.
 */
/**
 * The step that owns each error, so a message can be shown once, beside the box
 * it belongs to.
 *
 * The summary at the top used to list every error as well, so a carer who typed
 * an impossible age read the same sentence twice, once above the calculator and
 * once inside it. The summary now carries only what has nowhere else to go: an
 * error on a step you are not currently looking at.
 */
function stepForPath(path: string): StepId | null {
  if (path === 'children' || path.startsWith('children.')) return 'children';
  if (path.startsWith('finances.')) return 'finances';
  if (path === 'carer.englandRegion' || path === 'carer.localAuthoritySlug') return 'where';
  if (path.startsWith('carer.')) return 'history';
  return null;
}

const FIELD_ANCHORS: Record<string, string> = {
  'carer.englandRegion': 'council-select',
  'carer.previousWeeklyFosteringAllowance': 'months-since',
  'carer.orderDate': 'order-date',
  'carer.monthsSinceOrderMade': 'months-since',
  'finances.adultsInHousehold': 'adults',
  'finances.dependentChildrenInHousehold': 'household-children',
  children: 'age-0',
  // Ten, because ten is the limit the schema allows. The old list stopped at
  // four, so an error on a fifth child linked nowhere.
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`children.${i}.ageYears`, `age-${i}`]),
  ),
};

/** One message, in one place: beside the box it belongs to. */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span className="field__error" id={id} role="alert">
      {message}
    </span>
  );
}

function StepPanel({
  heading,
  stepNumber,
  headingRef,
  children,
}: {
  heading: string;
  stepNumber?: number;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
}) {
  return (
    <section>
      {stepNumber && (
        <p style={{ color: 'var(--colour-text-muted)', margin: 0 }}>Step {stepNumber}</p>
      )}
      <h2 ref={headingRef} tabIndex={-1} style={{ marginTop: '0.25rem' }}>
        {heading}
      </h2>
      {children}
    </section>
  );
}

/** A visible "back" on every step. The form must never trap keyboard users. */
function Nav({
  onBack,
  onNext,
  onSkip,
  nextLabel = 'Continue',
  nextDisabled = false,
  nextSecondary = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextSecondary?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem' }}>
      {onBack && (
        <button type="button" className="btn btn--secondary" onClick={onBack}>
          Back
        </button>
      )}
      <button
        type="button"
        className={nextSecondary ? 'btn btn--secondary' : 'btn'}
        onClick={onNext}
        disabled={nextDisabled}
      >
        {nextLabel}
      </button>
      {onSkip && (
        <button type="button" className="btn btn--secondary" onClick={onSkip}>
          Skip this step
        </button>
      )}
    </div>
  );
}

/**
 * [§15, §33] A GuardrailViolation is never shown raw to a user. A DataError
 * says what we do not have, rather than pretending.
 */
function EngineErrorFallback({ kind }: { kind: 'guardrail' | 'data' }) {
  return (
    <div className="callout callout--critical" role="alert">
      <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>
        {kind === 'guardrail'
          ? "We can't produce a reliable estimate for your situation"
          : "We don't have verified figures for that"}
      </h2>
      <p>
        {kind === 'guardrail'
          ? 'Something about your answers means we cannot give you a figure we are confident is right. We would rather tell you that than show you a number that might be wrong.'
          : 'Rather than guess, we have stopped. This usually means we do not yet hold a verified rate table or benefit figure for the date or the situation you gave us.'}
      </p>
      <p style={{ marginBottom: 0 }}>
        Please talk to one of the advice organisations listed at the bottom of this page, they can
        look at your case properly.
      </p>
    </div>
  );
}
