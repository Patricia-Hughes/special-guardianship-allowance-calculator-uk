/**
 * URL state — spec §22.
 *
 * [HARD R8] Financial data must NEVER go in a URL. URLs end up in server logs,
 * browser history, referrer headers and messaging-app previews. Only
 * non-sensitive, non-identifying inputs are shareable:
 *
 *   nation, englandRegion, localAuthoritySlug, child ages,
 *   disability flag, wasFosterCarerForThisChild            → yes
 *   previousWeeklyFosteringAllowance, all FinancesInput,
 *   onMeansTestedBenefits, postcode                        → NEVER
 *
 * A shared link reproduces the MAXIMUM calculation, not the means-tested one.
 */

import type { EnglandRegion, Nation } from '@sgo/engine';

export interface ShareableState {
  nation?: Nation;
  region?: EnglandRegion;
  la?: string;
  /** Child ages, in order. */
  ages?: number[];
  /** Which of those children have a disability or additional needs, by index. */
  disability?: number[];
  formerFosterCarer?: boolean;
}

const NATIONS: Nation[] = ['england', 'wales', 'scotland', 'northern-ireland'];
const REGIONS: EnglandRegion[] = ['london', 'south-east', 'rest-of-england'];

/** `/?n=england&r=south-east&la=kent&c=12,7&ff=1` */
export function toQueryString(s: ShareableState): string {
  const q = new URLSearchParams();
  if (s.nation) q.set('n', s.nation);
  if (s.region) q.set('r', s.region);
  if (s.la) q.set('la', s.la);
  if (s.ages?.length) q.set('c', s.ages.join(','));
  if (s.disability?.length) q.set('d', s.disability.join(','));
  if (s.formerFosterCarer) q.set('ff', '1');
  const str = q.toString();
  return str ? `?${str}` : '';
}

export function fromQueryString(search: string): ShareableState {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const out: ShareableState = {};

  const n = q.get('n');
  if (n && (NATIONS as string[]).includes(n)) out.nation = n as Nation;

  const r = q.get('r');
  if (r && (REGIONS as string[]).includes(r)) out.region = r as EnglandRegion;

  const la = q.get('la');
  if (la && /^[a-z0-9-]{1,64}$/.test(la)) out.la = la;

  const c = q.get('c');
  if (c) {
    const ages = c
      .split(',')
      .map((x) => Number.parseInt(x, 10))
      .filter((x) => Number.isInteger(x) && x >= 0 && x <= 17)
      .slice(0, 10);
    if (ages.length > 0) out.ages = ages;
  }

  const d = q.get('d');
  if (d) {
    const idx = d
      .split(',')
      .map((x) => Number.parseInt(x, 10))
      .filter((x) => Number.isInteger(x) && x >= 0 && x < 10);
    if (idx.length > 0) out.disability = idx;
  }

  if (q.get('ff') === '1') out.formerFosterCarer = true;

  return out;
}

export const SHARE_EXPLANATION =
  'This link shares the rates for your area and your children’s ages. It does not include ' +
  'anything you told us about your finances.';
