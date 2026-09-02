import { formatMoney, type MeansTestBreakdown } from '@sgo/engine';
import { ScrollableTable } from '../ui/ScrollableTable';

/**
 * "Show the arithmetic", spec §21 item 5, printed open (§19).
 *
 * A <details>/<summary> disclosure, not a div with an onClick (§24). The print
 * stylesheet forces it open, because the whole point of the printed page is
 * that a social worker can check the working.
 */
export function ArithmeticPanel({ breakdown }: { breakdown: MeansTestBreakdown }) {
  return (
    <details className="avoid-break">
      <summary>Show the arithmetic</summary>
      <p>
        Every step of the calculation, with your figures in it. All amounts are monthly unless the
        line says otherwise.
      </p>
      <ScrollableTable label="Step-by-step means test calculation">
        <table>
          <caption className="sr-only">Step-by-step means test calculation</caption>
          <thead>
            <tr>
              <th scope="col">Step</th>
              <th scope="col">Amount</th>
              <th scope="col">Running total</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.steps.map((step, i) => (
              <tr key={i}>
                <th scope="row" className="table__rowlabel">
                  {step.label}
                  {step.note && <div className="table__note">{step.note}</div>}
                </th>
                <td className="nowrap">
                  {step.operation === 'subtract' && '−'}
                  {step.operation === 'add' && '+'}
                  {formatMoney(step.valuePence)}
                </td>
                <td className={step.operation === 'result' ? 'nowrap strong' : 'nowrap'}>
                  {formatMoney(step.runningTotalPence)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
      <p>
        The 20% disregard comes off your income <strong>before</strong> your outgoings are taken
        into account. Councils sometimes do this the other way round, which produces a much larger
        contribution. It is worth checking which way yours has done it.
      </p>
    </details>
  );
}
