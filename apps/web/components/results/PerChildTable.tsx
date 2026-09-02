import { add, formatMoney, type CalculatorResult } from '@sgo/engine';
import { ScrollableTable } from '../ui/ScrollableTable';

const FLOOR_LABEL: Record<string, string> = {
  'reg7-former-foster-carer': 'Held at your previous fostering allowance (reg 7)',
  'kinship-zone-nma': 'Kinship Zones pilot rate',
  'scottish-recommended-allowance': 'Scottish Recommended Allowance',
};

/** Shown when there is more than one child (spec §21 item 3). */
export function PerChildTable({ result }: { result: CalculatorResult }) {
  if (result.perChild.length < 2) return null;
  return (
    <section aria-labelledby="per-child-heading" className="avoid-break">
      <h2 id="per-child-heading">Each child</h2>
      <ScrollableTable label="Weekly figures for each child">
        <table>
          <caption className="sr-only">
            Weekly figures for each child, in pounds
          </caption>
          <thead>
            <tr>
              <th scope="col">Age</th>
              <th scope="col">Age band</th>
              <th scope="col">Maximum</th>
              {result.meansTestApplied && <th scope="col">Your contribution</th>}
              {result.perChild.some((c) => c.childBenefitDeductionWeekly > 0) && (
                <th scope="col">Child Benefit taken off</th>
              )}
              <th scope="col">Estimate</th>
            </tr>
          </thead>
          <tbody>
            {result.perChild.map((c) => (
              <tr key={c.childId}>
                <th scope="row">{c.ageAtCalculation}</th>
                <td>{c.ageBand}</td>
                <td>{formatMoney(c.maximumWeekly)}</td>
                {result.meansTestApplied && (
                  <td>−{formatMoney(c.assessedContributionWeekly)}</td>
                )}
                {result.perChild.some((x) => x.childBenefitDeductionWeekly > 0) && (
                  <td>−{formatMoney(c.childBenefitDeductionWeekly)}</td>
                )}
                <td>
                  <strong>{formatMoney(c.estimatedAllowanceWeekly)}</strong>
                  {c.floorApplied && (
                    <div className="small">
                      {FLOOR_LABEL[c.floorApplied]}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Total
              </th>
              <td>
                {formatMoney(add(...result.perChild.map((c) => c.maximumWeekly)))}
              </td>
              {result.meansTestApplied && <td />}
              {result.perChild.some((x) => x.childBenefitDeductionWeekly > 0) && <td />}
              <td>
                <strong>{formatMoney(result.totalWeekly)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </ScrollableTable>
    </section>
  );
}
