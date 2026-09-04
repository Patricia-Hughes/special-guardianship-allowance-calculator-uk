/** Structured data — spec §27. */

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

/**
 * The calculator route. Deliberately NOT marked up as a Product, and with no
 * review or rating markup: it is not a product and there are no reviews (§27).
 */
export const webApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  url: SITE_URL,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
};

export function articleJsonLd(opts: {
  title: string;
  description: string;
  slug: string;
  published: string;
  modified: string;
  citationLabels: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    datePublished: opts.published,
    dateModified: opts.modified,
    // A person wrote these, not an organisation. Saying otherwise in the
    // structured data contradicts the byline on the page itself.
    author: { '@type': 'Person', name: AUTHOR_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: `${SITE_URL}/guidance/${opts.slug}`,
    citation: opts.citationLabels,
  };
}

export function faqJsonLd(faq: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function breadcrumbJsonLd(trail: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
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
