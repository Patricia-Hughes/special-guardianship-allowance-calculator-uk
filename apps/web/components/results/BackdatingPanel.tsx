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
 * "What should I have been paid since the order?" — spec §16.
 *
 * A disclosure rather than another step in the form. Most people come for one
 * number and leave; this is a second, harder question, and putting it in the
 * main flow would make everyone answer it.
 *
 * The period is split at every point the rate could change — each April, each
 * birthday that crosses an age band, the reg 7 two-year anniversary — because a
 * single average rate across two years is exactly the kind of figure a council
 * can pick apart.
 *
 * Where a year has no verified rates, it is left out and said so. A total built
 * partly on a guess is worse than a smaller total that holds up.
 */
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
  if (input.children.length !== 1) return null;

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
      setError(
        e instanceof Error
          ? e.message
          : 'We could not work that period out. Check the dates and try again.',
      );
    }
  };

  return (
    <details className="avoid-break" style={{ marginTop: '1.5rem' }}>
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
        <p className="field__error" role="alert" style={{ marginTop: '1rem' }}>
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
    <div aria-live="polite" style={{ marginTop: '1.5rem' }}>
      <h3>{nothingOwed ? 'We cannot see a shortfall' : 'The difference'}</h3>

      {nothingOwed ? (
        <p>
          Over the period you gave us, what you were paid matches or exceeds the maximum your
          council should have been starting from. That does not mean nothing is wrong — it means
          this particular check does not show a gap.
        </p>
      ) : (
        <>
          <p
            style={{
              color: 'var(--colour-money)',
              fontSize: '2.25rem',
              lineHeight: 1.1,
              fontWeight: 700,
              margin: '0.25rem 0',
            }}
          >
            {formatMoney(result.shortfall)}
          </p>
          <p>
            That is the gap between {formatMoney(result.totalShouldHaveBeenPaid)} — the maximum your
            council should have been starting from across{' '}
            {result.yearsCovered.map((y) => y.replace('-', '/')).join(', ')} — and the{' '}
            {formatMoney(result.totalActuallyPaid)} you were actually paid.
          </p>
        </>
      )}

      {result.blockedYears.length > 0 && (
        <div className="callout" role="note" aria-label="Years left out">
          <p style={{ margin: 0 }}>
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
                <th scope="row" style={{ fontWeight: 400, whiteSpace: 'nowrap' }}>
                  {formatDate(s.from)} to {formatDate(s.to)}
                  <div
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--colour-text-muted)',
                    }}
                  >
                    {s.financialYear.replace('-', '/')} · {reasonLabel(s.reason)}
                  </div>
                </th>
                <td style={{ whiteSpace: 'nowrap' }}>{s.weeks}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{s.ageBand}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatMoney(s.shouldHaveBeenPaidWeekly)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatMoney(s.actuallyPaidWeekly)}</td>
                <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
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
      return 'rates changed in April';
    case 'age-band-change':
      return 'moved up an age band';
    case 'reg7-anniversary':
      return 'two-year protection ended';
    case 'period-start':
      return 'start of the period';
    default:
      return 'end of the period';
  }
}
