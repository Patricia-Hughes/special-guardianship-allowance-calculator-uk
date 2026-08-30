import {
  RATE_TABLES,
  formatMoney,
  pence,
  type FlatNationRates,
  type Nation,
  type RegionalRates,
} from '@sgo/engine';
import { ScrollableTable } from './ScrollableTable';

/**
 * The national minimum allowance table, rendered from the versioned data.
 *
 * [§26] This component exists so that when the April uprating lands, every
 * mention of a rate updates everywhere at once. If a writer hardcodes "£255" in
 * prose it silently goes wrong every April — CI fails the build on a £ followed
 * by digits in MDX body content for exactly that reason.
 *
 * It is a server component with no client JS, so it renders with JavaScript
 * disabled (Tier 3, §32).
 */
export function RateTable({
  nation = 'england',
  year,
}: {
  nation?: Nation;
  year?: string;
}) {
  const table =
    RATE_TABLES.find((t) => (year ? t.financialYear === year : t.status !== 'PENDING_SOURCE')) ??
    RATE_TABLES[0];
  if (!table) return null;

  const section = nation === 'england' ? table.england : table[nation];
  if (!section) {
    return (
      <p>
        We do not yet publish {NATION_LABEL[nation]} rates for {table.financialYear.replace('-', '/')}.
      </p>
    );
  }

  const regional = 'regions' in section ? (section as RegionalRates) : null;
  const flat = regional ? null : (section as FlatNationRates);

  const label = `${NATION_LABEL[nation]} weekly minimum allowance, ${table.financialYear.replace('-', '/')}`;

  return (
    <ScrollableTable label={label}>
      <table>
        <caption>
          {NATION_LABEL[nation]} — weekly minimum allowance, financial year{' '}
          {table.financialYear.replace('-', '/')}
        </caption>
        <thead>
          <tr>
            <th scope="col">Age of child</th>
            {regional ? (
              <>
                <th scope="col">London</th>
                <th scope="col">South East</th>
                <th scope="col">Rest of England</th>
              </>
            ) : (
              <th scope="col">Weekly rate</th>
            )}
          </tr>
        </thead>
        <tbody>
          {section.ageBands.map((band) => (
            <tr key={band.id}>
              <th scope="row">
                {band.minAge}–{band.maxAge}
              </th>
              {regional ? (
                (['london', 'south-east', 'rest-of-england'] as const).map((r) => (
                  <td key={r}>{formatMoney(pence(regional.regions[r]?.[band.id] ?? 0))}</td>
                ))
              ) : (
                <td>{formatMoney(pence(flat?.rates[band.id] ?? 0))}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTable>
  );
}

const NATION_LABEL: Record<Nation, string> = {
  england: 'England',
  wales: 'Wales',
  scotland: 'Scotland',
  'northern-ireland': 'Northern Ireland',
};
