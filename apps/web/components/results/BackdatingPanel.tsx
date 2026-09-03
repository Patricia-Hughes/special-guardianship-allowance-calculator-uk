'use client';

import { useId, useState } from 'react';
import {
  calculateBackdating,
  formatMoney,
  type BackdatingResult,
  type CalculatorInput,
} from '@sgo/engine';
import { MoneyInput } from '../calculator/MoneyInput';
import { ScrollableTable } from '../ui/ScrollableTable';

/**
 * "What should I have been paid since the order?", spec §16.
 *
 * A disclosure rather than another step in the form. Most people come for one
 * number and leave; this is a second, harder question, and putting it in the
 * main flow would make everyone answer it.
 *
 * The period is split at every point the rate could change, each April, each
 * birthday that crosses an age band, the reg 7 two-year anniversary, because a
 * single average rate across two years is exactly the kind of figure a council
 * can pick apart.
 *
 * Where a year has no verified rates, it is left out and said so. A total built
 * partly on a guess is worse than a smaller total that holds up.
 */
/**
 * Turn an engine error into a sentence a carer can act on.
 *
 * The engine refuses rather than guessing, which is right, and its refusals name
 * the reason precisely for whoever has to fix the data. Those are two different
 * audiences. This maps the cases this panel can actually cause and keeps one
 * plain fallback for everything else.
 */
function carerFacing(e: unknown): string {
  const raw = e instanceof Error ? e.message : '';
  if (/not yet sourced|PENDING_SOURCE|No rate table effective/i.test(raw)) {
    return (
      'We do not hold checked figures for part of that period, so we will not guess at them. ' +
      'Try a later start date, or ask your council for its own figures for those years.'
    );
  }
  if (/one child at a time|needs a child/i.test(raw)) {
    return 'We can only work this out for one child at a time.';
  }
  if (/before its start|before the start/i.test(raw)) {
    return 'The end date is before the start date.';
  }
  return 'We could not work that period out. Check the dates and try again.';
}

export function BackdatingPanel({ input }: { input: CalculatorInput }) {
  const fromId = useId();
  const toId = useId();

  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState<string>(input.carer.orderDate ?? '');
  const [to, setTo] = useState<string>(today);
  const [paid, setPaid] = useState<{ raw: string; pence: number | null }>({ raw: '', pence: 0 });
  const [result, setResult] = useState<BackdatingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Backdating segments one child's history. Apportioning across several, each
  // with its own birthdays, is not specified, so the engine refuses it.
  //
  // It used to render nothing at all here, so a carer with two children never
  // saw that the question existed, let alone why it was missing. Saying so is
  // better than a silent absence: they can still ask their council, and they
  // now know there is something to ask about.
  if (input.children.length !== 1) {
    return (
      <details className="avoid-break gap-lg print-hide">
        <summary>Were you underpaid in the past?</summary>
        <p>
          If your council has been paying you less than it should have been, you can ask it to make
          up the difference, and the Ombudsman has told councils to do exactly that.
        </p>
        <p>
          <strong>We can only work this out for one child at a time.</strong> You have told us about{' '}
          {input.children.length} children, and each of them has their own birthdays and their own
          age bands, so a single total across all of them would be a figure your council could pick
          apart. Rather than give you one we cannot stand behind, we would rather say so.
        </p>
        <p className="flush-bot">
          You can still ask. The letter asking for a written breakdown, further down this page,
          covers it, and your council has to explain how it reached each child&apos;s figure.
        </p>
      </details>
    );
  }

  const run = (): void => {
    setError(null);
    setResult(null);
    if (!from) {
      setError('Enter the date you want to count from.');
      return;
    }
    if (to < from) {
      setError('The end date is before the start date.');
      return;
    }
    if (paid.pence === null) {
      setError('Enter what you have been paid, or 0 if you have had nothing.');
      return;
    }
    try {
      setResult(
        calculateBackdating({
          base: input,
          fromDate: from as CalculatorInput['asAtDate'] & string,
          toDate: to as CalculatorInput['asAtDate'] & string,
          actuallyPaidWeekly: paid.pence as never,
        }),
      );
    } catch (e) {
      // Never the raw message. Engine errors are written for maintainers and
      // say things like "No rate table effective on 2019-04-01", sometimes with
      // a spec section number attached. That is not something to put in front
      // of a grandparent who has just typed in two dates.
      setError(carerFacing(e));
    }
  };

  return (
    <details className="avoid-break gap-lg" >
      <summary>Were you underpaid in the past?</summary>
      <p>
        If your council has been paying you less than it should have been, you can ask for the
        difference. The Ombudsman has ordered councils to backdate payments in real cases.
      </p>
      <p>
        Tell us the period and what you have actually been paid, and we will work out the gap year
        by year.
      </p>

      <div className="field">
        <label className="field__label" htmlFor={fromId}>
          Count from
        </label>
        <span className="field__hint" id={`${fromId}-hint`}>
          Usually the date the special guardianship order was made.
        </span>
        <input
          id={fromId}
          name="backdate-from"
          type="date"
          value={from}
          aria-describedby={`${fromId}-hint`}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor={toId}>
          Count until
        </label>
        <span className="field__hint" id={`${toId}-hint`}>
          Today, unless you are checking a period that has already ended.
        </span>
        <input
          id={toId}
          name="backdate-to"
          type="date"
          value={to}
          aria-describedby={`${toId}-hint`}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      <MoneyInput
        name="backdate-paid"
        label="What the council has actually paid you, per week"
        hint="If it has paid you nothing, enter 0."
        value={paid.raw}
        onChange={(raw, pence) => setPaid({ raw, pence })}
      />

      <button type="button" className="btn" onClick={run}>
        Work out the difference
      </button>

      {error && (
        <p className="field__error gap-md" role="alert" >
          {error}
        </p>
      )}

      {result && <BackdatingResultView result={result} />}
    </details>
  );
}

function BackdatingResultView({ result }: { result: BackdatingResult }) {
  const nothingOwed = result.shortfall <= 0;

  return (
    <div aria-live="polite" className="gap-lg">
      <h3>{nothingOwed ? 'We cannot see a shortfall' : 'The difference'}</h3>

      {nothingOwed ? (
        <p>
          Over the period you gave us, what you were paid matches or exceeds the maximum your
          council should have been starting from. That does not mean nothing is wrong, it means
          this particular check does not show a gap.
        </p>
      ) : (
        <>
          <p
            className="backdating__figure"
          >
            {formatMoney(result.shortfall)}
          </p>
          <p>
            Your council should have been starting from{' '}
            {formatMoney(result.totalShouldHaveBeenPaid)} across{' '}
            {result.yearsCovered.map((y) => y.replace('-', '/')).join(', ')}. You were actually
            paid {formatMoney(result.totalActuallyPaid)}.
          </p>
        </>
      )}

      {result.blockedYears.length > 0 && (
        <div className="callout" role="note" aria-label="Years left out">
          <p className="flush">
            <strong>
              {result.blockedYears.map((y) => y.replace('-', '/')).join(' and ')}{' '}
              {result.blockedYears.length === 1 ? 'is' : 'are'} not included.
            </strong>{' '}
            We do not hold verified rates for{' '}
            {result.blockedYears.length === 1 ? 'that year' : 'those years'} in your part of the UK,
            and we will not estimate them. The figure above covers only the years we can evidence,
            so the real gap may be larger.
          </p>
        </div>
      )}

      <ScrollableTable label="Backdating period by period">
        <table>
          <caption className="sr-only">
            What you should have been paid, period by period
          </caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Weeks</th>
              <th scope="col">Age band</th>
              <th scope="col">Should have been</th>
              <th scope="col">Actually paid</th>
              <th scope="col">Difference</th>
            </tr>
          </thead>
          <tbody>
            {result.segments.map((s, i) => (
              <tr key={i}>
                <th scope="row" className="table__rowlabel nowrap">
                  {formatDate(s.from)} to {formatDate(s.to)}
                  <div className="table__note">
                    {s.financialYear.replace('-', '/')} · {reasonLabel(s.reason)}
                  </div>
                </th>
                <td className="nowrap">{s.weeks}</td>
                <td className="nowrap">{s.ageBand}</td>
                <td className="nowrap">{formatMoney(s.shouldHaveBeenPaidWeekly)}</td>
                <td className="nowrap">{formatMoney(s.actuallyPaidWeekly)}</td>
                <td className="nowrap strong">
                  {formatMoney(s.segmentShortfall)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>

      <h4>Before you use this figure</h4>
      <ul>
        {result.caveats.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case 'financial-year-change':
      return 'rates changed on 1 April';
    case 'age-band-change':
      return 'moved up an age band';
    case 'reg7-anniversary':
      return 'the two-year point passed';
    case 'april-tax-year-boundary':
      return 'the tax year began';
    case 'period-start':
      return 'start of the period';
    default:
      return 'end of the period';
  }
}
