/**
 * URL state, spec §22.
 *
 * [HARD R8] Financial data must NEVER go in a URL. URLs end up in server logs,
 * browser history, referrer headers and messaging-app previews. Only
 * non-sensitive, non-identifying answers are shareable:
 *
 *   nation, englandRegion, localAuthoritySlug, child ages,
 *   disability flag, wasFosterCarerForThisChild            yes
 *   previousWeeklyFosteringAllowance, all FinancesInput,
 *   onMeansTestedBenefits, postcode                        NEVER
 *
 * So a shared link reproduces the MAXIMUM calculation, never the means-tested
 * one. Everything read back in is re-validated here rather than trusted: a URL
 * is user input, and it may have been edited, truncated by a chat app, or
 * simply typed wrong.
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

const NATIONS: readonly string[] = ['england', 'wales', 'scotland', 'northern-ireland'];
const REGIONS: readonly string[] = ['london', 'south-east', 'rest-of-england'];
const SLUG = /^[a-z0-9-]{1,64}$/;

/** The schema's own limits, so a link cannot carry more than the form accepts. */
const MAX_CHILDREN = 10;
const MAX_AGE = 17;

/** Short keys, because the link is meant to be pasted into a message. */
const KEY = {
  nation: 'n',
  region: 'r',
  la: 'la',
  ages: 'c',
  disability: 'd',
  formerFosterCarer: 'ff',
} as const;

/** `/?n=england&r=south-east&la=kent&c=12,7&ff=1` */
export function toQueryString(s: ShareableState): string {
  const q = new URLSearchParams();
  if (s.nation) q.set(KEY.nation, s.nation);
  if (s.region) q.set(KEY.region, s.region);
  if (s.la) q.set(KEY.la, s.la);
  if (s.ages?.length) q.set(KEY.ages, s.ages.join(','));
  if (s.disability?.length) q.set(KEY.disability, s.disability.join(','));
  if (s.formerFosterCarer) q.set(KEY.formerFosterCarer, '1');

  const query = q.toString();
  return query ? `?${query}` : '';
}

/** Parse a comma-separated list of integers, keeping only those in range. */
function numberList(raw: string | null, min: number, max: number): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((x) => Number.parseInt(x, 10))
    .filter((x) => Number.isInteger(x) && x >= min && x <= max);
}

export function fromQueryString(search: string): ShareableState {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const out: ShareableState = {};

  const nation = q.get(KEY.nation);
  if (nation && NATIONS.includes(nation)) out.nation = nation as Nation;

  const region = q.get(KEY.region);
  if (region && REGIONS.includes(region)) out.region = region as EnglandRegion;

  const la = q.get(KEY.la);
  if (la && SLUG.test(la)) out.la = la;

  const ages = numberList(q.get(KEY.ages), 0, MAX_AGE).slice(0, MAX_CHILDREN);
  if (ages.length > 0) out.ages = ages;

  const disability = numberList(q.get(KEY.disability), 0, MAX_CHILDREN - 1);
  if (disability.length > 0) out.disability = disability;

  if (q.get(KEY.formerFosterCarer) === '1') out.formerFosterCarer = true;

  return out;
}

export const SHARE_EXPLANATION =
  'This link shares the rates for your area and your children’s ages. It does not include ' +
  'anything you told me about your finances.';
