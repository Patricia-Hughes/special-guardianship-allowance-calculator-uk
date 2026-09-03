/**
 * Looking up what a nation, region and age band are worth.
 *
 * Every function here either finds a published figure or throws. Nothing is
 * derived, interpolated or defaulted: a rate the data does not hold is a
 * DataError, never a plausible guess.
 */

import { defaultDeps, type EngineDeps } from './deps.js';
import { DataError } from './errors.js';
import { pence, type Pence } from './money.js';
import { LA_REGION_MAP, cite, publishableLaOverrideIn } from './referenceData.js';
import { ageOf } from './resolve.js';
import type {
  AgeBand,
  CarerInput,
  Citation,
  ChildInput,
  EnglandRegion,
  FlatNationRates,
  IsoDate,
  Nation,
  RateTable,
  Regime,
  RegionalRates,
} from './types.js';

export function regimeFor(nation: Nation): Regime {
  switch (nation) {
    case 'england':
      return 'england-sgo';
    case 'wales':
      return 'wales-sgo';
    case 'northern-ireland':
      return 'ni-sgo';
    case 'scotland':
      return 'scotland-kinship';
  }
}

function nationRates(rates: RateTable, nation: Nation): RegionalRates | FlatNationRates {
  const table = nation === 'england' ? rates.england : rates[nation];
  if (!table) {
    throw new DataError(
      `No ${nation} rates in the ${rates.financialYear} table. They must be sourced, not derived.`,
    );
  }
  return table;
}

/**
 * The band covering a child's age.
 *
 * Only minAge and maxAge decide this. Some bands also carry `openEnded: true`,
 * which the Welsh top band does because the circular prints it as "16+": that
 * flag is a note to whoever next reads the data explaining why maxAge is 17
 * when the source names no upper limit. It is documentation, not behaviour, and
 * nothing here reads it. Bands must tile 0 to 17 exactly, because the product is
 * for children under 18, so an open band and a band closed at 17 are the same
 * band as far as this function is concerned.
 */
export function resolveAgeBand(
  rates: RateTable,
  nation: Nation,
  child: ChildInput,
  asAt: IsoDate,
): AgeBand {
  const age = ageOf(child, asAt);
  const band = nationRates(rates, nation).ageBands.find((b) => age >= b.minAge && age <= b.maxAge);
  if (!band) {
    throw new DataError(`No ${nation} age band covers age ${age} in ${rates.financialYear}`);
  }
  return band;
}

/**
 * England region, from the explicit choice or from the council the carer picked.
 *
 * Spec §12 makes picking a council the default and most reliable path, and
 * la-region-map.json is what makes that work: it covers every English
 * children's services authority, whereas la-overrides holds policy detail for a
 * handful. So the region map is consulted for every council, not just the ones
 * we hold a policy for.
 *
 * An explicit region always wins. §12 route 3 is the fallback that must always
 * be available, including where our mapping is wrong.
 */
export function resolveEnglandRegion(
  carer: CarerInput,
  deps: EngineDeps = defaultDeps(),
): EnglandRegion {
  if (carer.englandRegion) return carer.englandRegion;

  const la = publishableLaOverrideIn(deps.laOverrides, carer.localAuthoritySlug);
  if (la) return la.region;

  const mapped = carer.localAuthoritySlug ? LA_REGION_MAP[carer.localAuthoritySlug] : undefined;
  if (mapped) return mapped;

  throw new DataError('An England region is required. Choose a region or a council.');
}

/**
 * The citation for the table a figure actually came from.
 *
 * [R3] Every numeric output carries the citation it derives from. The result
 * page used to list only the LAW: the statutory guidance saying the fostering
 * allowance is the starting point, and the regulations behind it. None of them
 * states the figure. A carer printing the page and handing it to a social
 * worker was asked where their number came from and the document answered with
 * statutes, while the GOV.UK table that actually prints it was nowhere on the
 * page.
 *
 * Read off the table in use, never hardcoded. The Scottish path used to name
 * the 2026/27 source whatever year it had priced, which is the same fault as
 * attributing a Welsh figure to a page that does not contain it.
 */
export function citeRateSource(rates: RateTable, nation: Nation): Citation {
  return cite(nationRates(rates, nation).sourceId);
}

/** The national minimum weekly rate for this carer's area and this age band. */
export function lookupRate(
  rates: RateTable,
  carer: CarerInput,
  band: AgeBand,
  deps: EngineDeps = defaultDeps(),
): Pence {
  const table = nationRates(rates, carer.nation);

  if (carer.nation === 'england') {
    const region = resolveEnglandRegion(carer, deps);
    const value = (table as RegionalRates).regions[region]?.[band.id];
    if (value === undefined) {
      throw new DataError(`No England rate for ${region} / ${band.id} in ${rates.financialYear}`);
    }
    return pence(value);
  }

  const value = (table as FlatNationRates).rates[band.id];
  if (value === undefined) {
    throw new DataError(`No ${carer.nation} rate for ${band.id} in ${rates.financialYear}`);
  }
  return pence(value);
}
