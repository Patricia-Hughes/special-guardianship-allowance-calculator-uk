/** Structured data — spec §27. */

export const SITE_NAME = 'Special Guardianship Allowance Calculator';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.invalid';

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
    author: { '@type': 'Organization', name: SITE_NAME },
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
