/**
 * Structured data — spec §27.
 *
 * One connected graph per page, not a pile of separate blocks.
 *
 * The previous version emitted three or four independent objects with no `@id`
 * on any of them, which meant a crawler had no way to know that the Person
 * credited on sixteen guides was the person the About page is about, or that any
 * of it belonged to one site. Every node here carries a stable `@id` and is
 * referenced by it, so the site is one entity graph rather than a set of islands.
 *
 * Two rules this file exists to hold:
 *
 *   Nothing claims professional standing. No jobTitle, no hasCredential, no
 *   worksFor. The site says plainly on three pages that she is not a solicitor
 *   and not a social worker, and markup that quietly says otherwise is the same
 *   dishonesty as a figure without a source. `knowsAbout` carries the real
 *   expertise, which is subject familiarity, and that is true.
 *
 *   Nothing is an Organization. She is one person. `publisher` is the Person.
 *
 * scripts/check-schema.ts enforces both against the built HTML.
 */

import type { Citation } from '@sgo/engine';

export const SITE_NAME = 'Special Guardianship Allowance Calculator';

/**
 * The canonical origin. Every canonical tag, the sitemap, robots.txt, the Open
 * Graph tags and the structured data are built from this one value, so it is the
 * only place the domain is written down.
 *
 * No trailing slash: everything here concatenates paths onto it.
 *
 * The env var still wins, so a staging deploy can point somewhere else without a
 * code change. Staging also sets NEXT_PUBLIC_NOINDEX=1, which robots.ts reads.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://specialguardianshipallowance.uk'
).replace(/\/$/, '');

/**
 * The one place the author's name is written down.
 *
 * It appears on every guide, in the structured data, and on the About page. A
 * site that spells its author's name two ways reads as though nobody is really
 * behind it, which is the opposite of what a byline is for. Imported, never
 * retyped.
 */
export const AUTHOR_NAME = 'Patricia Hughes';

const LANG = 'en-GB';

/** Stable node identifiers. Everything else points at these. */
export const ID = {
  website: `${SITE_URL}/#website`,
  person: `${SITE_URL}/#patricia`,
  calculator: `${SITE_URL}/#calculator`,
  dataset: `${SITE_URL}/rates#dataset`,
  webPage: (path: string) => `${SITE_URL}${path}#webpage`,
  breadcrumb: (path: string) => `${SITE_URL}${path}#breadcrumb`,
  article: (slug: string) => `${SITE_URL}/guidance/${slug}#article`,
  faq: (slug: string) => `${SITE_URL}/guidance/${slug}#faq`,
} as const;

/** A reference to a node defined elsewhere in the same graph. */
const ref = (id: string) => ({ '@id': id });

// ── The two nodes every page shares ─────────────────────────────────────────

const websiteNode = {
  '@type': 'WebSite',
  '@id': ID.website,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  description:
    'What your council should be paying you as a special guardian, the rule behind every figure, and what to ask when the figure looks wrong.',
  inLanguage: LANG,
  publisher: ref(ID.person),
  copyrightHolder: ref(ID.person),
  privacyPolicy: `${SITE_URL}/privacy`,
  // No potentialAction/SearchAction: there is no search on this site, and
  // declaring one Google cannot use is a claim about a feature that is not here.
};

const personNode = {
  '@type': 'Person',
  '@id': ID.person,
  name: AUTHOR_NAME,
  url: `${SITE_URL}/about`,
  description:
    'A grandmother and special guardian. After her allowance was set without an explanation she could reproduce, she built the table of rates and sources that this site is made from.',
  nationality: 'GB',
  knowsAbout: [
    'Special guardianship allowances',
    'The Special Guardianship Regulations 2005',
    'Fostering national minimum allowances in the United Kingdom',
    'Local authority means testing of special guardianship financial support',
    'Local Government and Social Care Ombudsman decisions on kinship care',
  ],
  mainEntityOfPage: ref(ID.webPage('/about')),
};

// ── Citations as entities ───────────────────────────────────────────────────

/**
 * The same regulation cited from six guides is one entity, not six, because the
 * `@id` is the source's own URL.
 *
 * `legislationIdentifier` is derived from the legislation.gov.uk path rather
 * than typed by hand, so it cannot disagree with the link beside it. Anything
 * not on legislation.gov.uk gets no identifier rather than a guessed one.
 */
function legislationIdentifier(url: string): string | undefined {
  const si = /legislation\.gov\.uk\/([a-z]+)\/(\d{4})\/(\d+)/.exec(url);
  if (!si) return undefined;
  const [, kind, year, number] = si;
  if (kind === 'uksi' || kind === 'wsi' || kind === 'ssi' || kind === 'nisr') {
    return `SI ${year}/${number}`;
  }
  if (kind === 'ukpga' || kind === 'asp' || kind === 'anaw' || kind === 'nia') {
    return `${year} c. ${number}`;
  }
  return undefined;
}

export function citationNode(c: Citation): Record<string, unknown> {
  const base: Record<string, unknown> = {
    '@id': c.url,
    name: c.label,
    url: c.url,
    inLanguage: LANG,
  };
  if (c.kind === 'statute' || c.kind === 'regulation') {
    const identifier = legislationIdentifier(c.url);
    return {
      ...base,
      '@type': 'Legislation',
      // The enacting jurisdiction, which is what ELI means here. Where a
      // regulation extends is a different question and is not claimed.
      legislationJurisdiction: 'United Kingdom',
      ...(identifier ? { legislationIdentifier: identifier } : {}),
    };
  }
  if (c.kind === 'dataset') {
    return { ...base, '@type': 'Dataset' };
  }
  // Judgments, Ombudsman decisions and statutory guidance. schema.org has no
  // type for a court decision, so CreativeWork is the honest general case.
  return { ...base, '@type': 'CreativeWork' };
}

// ── Page-level nodes ────────────────────────────────────────────────────────

export type PageType = 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage';

export interface PageGraphOptions {
  /** Path with a leading slash and no trailing slash. The home page is '/'. */
  path: string;
  type?: PageType;
  name: string;
  description: string;
  /** Breadcrumb trail. Home is prepended automatically. */
  trail?: Array<{ name: string; url: string }>;
  datePublished?: string;
  dateModified?: string;
  lastReviewed?: string;
  /** The @id of the thing this page is primarily about. */
  mainEntity?: string;
  /** @ids of the things this page collects, for a CollectionPage. */
  hasPart?: string[];
  /** Extra nodes: Article, FAQPage, Dataset, WebApplication. */
  extra?: Array<Record<string, unknown>>;
}

export function pageGraph(opts: PageGraphOptions) {
  const path = opts.path;
  const trail = [{ name: 'Home', url: '/' }, ...(opts.trail ?? [])];

  const page: Record<string, unknown> = {
    '@type': opts.type ?? 'WebPage',
    '@id': ID.webPage(path),
    url: `${SITE_URL}${path}`,
    name: opts.name,
    description: opts.description,
    isPartOf: ref(ID.website),
    inLanguage: LANG,
    breadcrumb: ref(ID.breadcrumb(path)),
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    // lastReviewed and reviewedBy are real WebPage properties and almost nobody
    // uses them. Every guide already shows both on the page, so the markup only
    // states what a reader can already see.
    ...(opts.lastReviewed
      ? { lastReviewed: opts.lastReviewed, reviewedBy: ref(ID.person) }
      : {}),
    ...(opts.mainEntity ? { mainEntity: ref(opts.mainEntity) } : {}),
    ...(opts.hasPart ? { hasPart: opts.hasPart.map(ref) } : {}),
  };

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': ID.breadcrumb(path),
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [websiteNode, personNode, page, breadcrumb, ...(opts.extra ?? [])],
  };
}

// ── The nodes individual pages add ──────────────────────────────────────────

/**
 * The calculator. Deliberately NOT a Product, with no review or rating markup:
 * it is not a product and there are no reviews (§27). `isAccessibleForFree`
 * replaces the old Offer at price zero, which framed a free public tool as
 * something with a price on it.
 */
export const calculatorNode = {
  '@type': 'WebApplication',
  '@id': ID.calculator,
  name: 'Special guardianship allowance calculator',
  url: `${SITE_URL}/`,
  applicationCategory: 'FinanceApplication',
  applicationSubCategory: 'Benefits and allowance calculator',
  operatingSystem: 'Any',
  browserRequirements:
    'Requires JavaScript. The rate tables and all 16 guides work without it.',
  isAccessibleForFree: true,
  inLanguage: LANG,
  countriesSupported: 'GB',
  author: ref(ID.person),
  publisher: ref(ID.person),
  isPartOf: ref(ID.website),
  privacyPolicy: `${SITE_URL}/privacy`,
  featureList: [
    'Maximum special guardianship allowance for England, Wales, Scotland and Northern Ireland',
    'Per-child figures using the fostering national minimum allowance for each age band',
    'Optional means test using the standard local authority model',
    'Former foster carer reward element under regulation 7',
    'Arrears calculation across previous financial years',
    'Nine template letters to a local authority, pre-filled',
    'Every figure shown with the published source it came from',
  ],
};

export function articleNode(opts: {
  slug: string;
  title: string;
  description: string;
  published: string;
  modified: string;
  citations: Citation[];
  about: string[];
}) {
  return {
    '@type': 'Article',
    '@id': ID.article(opts.slug),
    isPartOf: ref(ID.webPage(`/guidance/${opts.slug}`)),
    mainEntityOfPage: ref(ID.webPage(`/guidance/${opts.slug}`)),
    headline: opts.title,
    description: opts.description,
    datePublished: opts.published,
    dateModified: opts.modified,
    inLanguage: LANG,
    isAccessibleForFree: true,
    author: ref(ID.person),
    publisher: ref(ID.person),
    about: opts.about.map((name) => ({ '@type': 'Thing', name })),
    citation: opts.citations.map(citationNode),
  };
}

export function faqNode(slug: string, faq: Array<{ q: string; a: string }>) {
  return {
    '@type': 'FAQPage',
    '@id': ID.faq(slug),
    isPartOf: ref(ID.webPage(`/guidance/${slug}`)),
    inLanguage: LANG,
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

/**
 * The rate tables are a genuine published dataset: four nations, three financial
 * years, and the source recorded next to every figure.
 *
 * No `distribution`. The site publishes no machine-readable rates file, and
 * pointing at one that does not exist is the same class of error as a figure
 * without a source.
 */
export function datasetNode(opts: {
  temporalCoverage: string;
  citations: Citation[];
}) {
  return {
    '@type': 'Dataset',
    '@id': ID.dataset,
    name: 'Fostering national minimum allowances, United Kingdom',
    description:
      'Weekly fostering minimum allowances by child age band for England, Wales, Scotland and Northern Ireland, transcribed from each government’s own published table, with the source recorded next to every figure and gaps left blank where no primary source has been located.',
    url: `${SITE_URL}/rates`,
    inLanguage: LANG,
    isAccessibleForFree: true,
    creator: ref(ID.person),
    isPartOf: ref(ID.website),
    temporalCoverage: opts.temporalCoverage,
    spatialCoverage: [
      { '@type': 'Place', name: 'England' },
      { '@type': 'Place', name: 'Wales' },
      { '@type': 'Place', name: 'Scotland' },
      { '@type': 'Place', name: 'Northern Ireland' },
    ],
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Weekly minimum allowance', unitText: 'GBP per week' },
      { '@type': 'PropertyValue', name: 'Child age band' },
      { '@type': 'PropertyValue', name: 'Financial year' },
    ],
    citation: opts.citations.map(citationNode),
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Serialised from our own typed objects, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
