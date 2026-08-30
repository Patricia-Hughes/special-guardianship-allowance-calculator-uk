import { formatMoney, type CalculatorInput, type Pence } from '@sgo/engine';

const NATION_LABEL: Record<string, string> = {
  england: 'England',
  wales: 'Wales',
  scotland: 'Scotland',
  'northern-ireland': 'Northern Ireland',
};

const REGION_LABEL: Record<string, string> = {
  london: 'London',
  'south-east': 'South East England',
  'rest-of-england': 'Rest of England',
};

const LOOKED_AFTER: Record<string, string> = {
  true: 'Yes',
  false: 'No',
  unknown: 'Not sure',
};

/**
 * [§19 item 2] The printed document must contain the inputs the user gave, so a
 * social worker can check them.
 *
 * Without this the printed page is an assertion. With it, it is a calculation
 * somebody else can follow and disagree with — which is the point of handing it
 * over.
 *
 * Print-only: on screen the user can see their own answers in the form.
 */
export function PrintedInputs({
  input,
  councilName,
}: {
  input: CalculatorInput;
  councilName?: string;
}) {
  const money = (p: Pence | undefined): string =>
    p === undefined ? 'Not given' : formatMoney(p);

  return (
    <section className="print-only avoid-break" aria-labelledby="printed-inputs-heading">
      <h2 id="printed-inputs-heading">What this estimate is based on</h2>
      <table>
        <caption className="sr-only">The answers this estimate was calculated from</caption>
        <tbody>
          <tr>
            <th scope="row">Nation</th>
            <td>{NATION_LABEL[input.carer.nation] ?? input.carer.nation}</td>
          </tr>
          {input.carer.englandRegion && (
            <tr>
              <th scope="row">Region</th>
              <td>{REGION_LABEL[input.carer.englandRegion] ?? input.carer.englandRegion}</td>
            </tr>
          )}
          {councilName && (
            <tr>
              <th scope="row">Council</th>
              <td>{councilName}</td>
            </tr>
          )}
          {input.children.map((c, i) => (
            <tr key={c.id}>
              <th scope="row">Child {input.children.length > 1 ? i + 1 : ''}</th>
              <td>
                Age {c.ageYears}
                {c.hasDisabilityOrAdditionalNeeds ? ', has a disability or additional needs' : ''}
                {'. '}
                In the council&apos;s care immediately before the order:{' '}
                {LOOKED_AFTER[String(c.wasLookedAfterImmediatelyBeforeOrder)]}
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row">Was the child&apos;s foster carer before the order</th>
            <td>{input.carer.wasFosterCarerForThisChild ? 'Yes' : 'No'}</td>
          </tr>
          {input.carer.wasFosterCarerForThisChild && (
            <>
              <tr>
                <th scope="row">Previous weekly fostering allowance</th>
                <td>{money(input.carer.previousWeeklyFosteringAllowance)}</td>
              </tr>
              <tr>
                <th scope="row">Order made</th>
                <td>
                  {input.carer.orderDate
                    ? input.carer.orderDate
                    : `About ${input.carer.monthsSinceOrderMade} months ago`}
                </td>
              </tr>
            </>
          )}
          <tr>
            <th scope="row">Receives means-tested benefits</th>
            <td>{input.carer.onMeansTestedBenefits ? 'Yes' : 'No'}</td>
          </tr>
          <tr>
            <th scope="row">Council deducts Child Benefit</th>
            <td>
              {input.applyChildBenefitDeduction
                ? 'Yes, as told to us by the carer'
                : 'Not applied — we never deduct it unless told to'}
            </td>
          </tr>
          {input.finances && (
            <tr>
              <th scope="row">Financial details</th>
              <td>
                Given, and used for the means-tested estimate. The full arithmetic is set out below.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p>
        If any of this is wrong, the figures below will be wrong too. These answers were entered by
        the carer and were not checked against any records.
      </p>
    </section>
  );
}
