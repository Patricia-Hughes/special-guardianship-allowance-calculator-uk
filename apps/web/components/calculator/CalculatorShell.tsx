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

/**
 * Step orchestration — spec §20. Six steps, progressive.
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
  ageYears: string;
  hasDisabilityOrAdditionalNeeds: boolean;
  wasLookedAfterImmediatelyBeforeOrder: 'yes' | 'no' | 'unknown';
}

const emptyChild = (): ChildForm => ({
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
  ['savingsCapital', 'Savings, in total', 'Not monthly — the total you have.'],
] as const;

type MoneyFieldName = (typeof MONEY_FIELDS)[number][0];

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
          ageYears: String(age),
          hasDisabilityOrAdditionalNeeds: disability.has(i),
          wasLookedAfterImmediatelyBeforeOrder: 'unknown' as const,
        })),
      );
      setHouseholdChildren(String(s.ages.length));
    }
    if (s.formerFosterCarer) setWasFosterCarer(true);
  }, []);

  // [§20] Auto-mark the eldest by age. Only the eldest attracts the higher
  // Child Benefit rate, so getting it wrong shifts the figure — but the carer
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

  // Results are announced on render (§24).
  useEffect(() => {
    if (step !== 'where') stepHeadingRef.current?.focus();
  }, [step]);

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
            adultsInHousehold: Number.parseInt(adults, 10) || 1,
            dependentChildrenInHousehold:
              Number.parseInt(householdChildren, 10) || children.length,
          } as FinancesInput)
        : undefined;

      return {
        carer: {
          nation: (nation || 'england') as Nation,
          ...(region ? { englandRegion: region } : {}),
          ...(la ? { localAuthoritySlug: la } : {}),
          wasFosterCarerForThisChild: wasFosterCarer,
          ...(orderDate ? { orderDate: orderDate as CalculatorInput['asAtDate'] } : {}),
          monthsSinceOrderMade: Number.parseInt(monthsSinceOrder, 10) || 0,
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

  const run = useCallback(
    (withFinances: boolean): void => {
      setErrors([]);
      setEngineError(null);
      const built = buildInput(withFinances);
      try {
        setResult(calculate(built));
        setResultInput(built);
      } catch (e) {
        setResult(null);
        setResultInput(null);
        if (e instanceof ValidationError) {
          setErrors(e.issues.length > 0 ? [...e.issues] : [{ path: '', message: e.message }]);
          queueMicrotask(() => errorSummaryRef.current?.focus());
        } else if (e instanceof GuardrailViolation) {
          // [§15 UI contract] Never show the raw error. Log the rule code only —
          // no user data — and render the fallback.
          console.error(`GuardrailViolation: ${e.rule}`);
          setEngineError('guardrail');
        } else if (e instanceof DataError) {
          setEngineError('data');
        } else {
          setEngineError('data');
        }
      }
    },
    [buildInput],
  );

  const goTo = (next: StepId): void => {
    setStep(next);
    setMaxStepReached((prev) => (ORDER.indexOf(next) > ORDER.indexOf(prev) ? next : prev));
  };

  const showInterstitial = (): void => {
    run(false);
    goTo('result');
  };

  return (
    <div>
      {errors.length > 0 && (
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
            {errors.map((e, i) => {
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
                  them — one of the age bands in the sources we have looks wrong, and a wrong figure
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
                <fieldset>
                  <legend>Or choose your region</legend>
                  <span className="field__hint">
                    Rates are higher in London and the South East. If you picked a council above,
                    we have already filled this in.
                  </span>
                  {(
                    [
                      ['london', 'London — the 32 boroughs and the City of London'],
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
            {children.map((c, i) => (
              <fieldset
                key={i}
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
                  <input
                    id={`age-${i}`}
                    type="text"
                    inputMode="numeric"
                    value={c.ageYears}
                    aria-describedby={`age-hint-${i}`}
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
                onClick={() => setChildren((prev) => [...prev, emptyChild()])}
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
                  onChange={(raw, p) => setPreviousAllowance({ raw, pence: p })}
                />
                <div className="field">
                  <label className="field__label" htmlFor="order-date">
                    When was the special guardianship order made?
                  </label>
                  <span className="field__hint" id="order-date-hint">
                    If you are not sure of the exact day, the month is close enough.
                  </span>
                  <input
                    id="order-date"
                    type="date"
                    value={orderDate}
                    aria-describedby="order-date-hint"
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
              <input
                id="months-since"
                type="text"
                inputMode="numeric"
                value={monthsSinceOrder}
                aria-describedby="months-since-hint"
                onChange={(e) => setMonthsSinceOrder(e.target.value)}
              />
            </div>

            <Nav onBack={() => goTo('result')} onNext={() => { run(false); goTo('benefits'); }} />
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
              onNext={() => { run(false); goTo(FLAGS.MEANS_TEST_ENABLED ? 'finances' : 'council'); }}
            />
          </StepPanel>
        )}

        {step === 'finances' && FLAGS.MEANS_TEST_ENABLED && (
          <StepPanel heading="Your finances" headingRef={stepHeadingRef} stepNumber={5}>
            <div className="callout" role="note" aria-label="Note">
              <p style={{ margin: 0 }}>
                <strong>You can skip this.</strong> Fill it in only if you want an estimate of what
                you might get after a means test. Nothing you type here leaves your browser — there
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
                onChange={(raw, p) => setMoney((prev) => ({ ...prev, [name]: { raw, pence: p } }))}
              />
            ))}

            <div className="field">
              <label className="field__label" htmlFor="adults">
                How many adults live in your household?
              </label>
              <input
                id="adults"
                type="text"
                inputMode="numeric"
                value={adults}
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
              <input
                id="household-children"
                type="text"
                inputMode="numeric"
                value={householdChildren}
                aria-describedby="household-children-hint"
                onChange={(e) => setHouseholdChildren(e.target.value)}
              />
            </div>

            <Nav
              onBack={() => goTo('benefits')}
              onNext={() => { setWantsMeansTest(true); run(true); goTo('council'); }}
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
              If you know any of this, it makes the guidance more useful. If you do not, leave it —
              and the result will tell you how to find out.
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
              onNext={() => { run(wantsMeansTest && FLAGS.MEANS_TEST_ENABLED); goTo('result'); }}
              nextLabel="Update my result"
            />
          </StepPanel>
        )}
      </div>

      {result && resultInput && !engineError && (
        <div aria-live="polite">
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
const FIELD_ANCHORS: Record<string, string> = {
  'carer.englandRegion': 'council-select',
  'carer.previousWeeklyFosteringAllowance': 'months-since',
  'carer.orderDate': 'order-date',
  'carer.monthsSinceOrderMade': 'months-since',
  'finances.adultsInHousehold': 'adults',
  'finances.dependentChildrenInHousehold': 'household-children',
  children: 'age-0',
  'children.0.ageYears': 'age-0',
  'children.1.ageYears': 'age-1',
  'children.2.ageYears': 'age-2',
  'children.3.ageYears': 'age-3',
};

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
        Please talk to one of the advice organisations listed at the bottom of this page — they can
        look at your case properly.
      </p>
    </div>
  );
}
