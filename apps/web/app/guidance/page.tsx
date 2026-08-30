import type { Metadata } from 'next';
import { allContent } from '../../lib/content';
import { JsonLd, breadcrumbJsonLd } from '../../lib/jsonLd';
import { CalculatorCTA } from '../../components/ui/mdxComponents';

export const metadata: Metadata = {
  title: 'Guides to special guardianship allowances',
  description:
    'Plain-English guides to how special guardianship allowances are decided, what your council must consider, and what to do when the figure looks wrong.',
  alternates: { canonical: '/guidance' },
};

export default function GuidanceIndex() {
  const docs = allContent('guidance');
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: 'Guides', url: '/guidance' },
        ])}
      />
      <h1>Guides</h1>
      <p>
        Everything here is written to be read once, quickly, by someone who is tired and worried.
        Every legal point has its source next to it.
      </p>
      <ul>
        {docs.map((d) => (
          <li key={d.frontmatter.slug} style={{ marginBottom: '1rem' }}>
            <a href={`/guidance/${d.frontmatter.slug}`}>
              <strong>{d.frontmatter.title}</strong>
            </a>
            <div>{d.frontmatter.description}</div>
          </li>
        ))}
      </ul>
      <CalculatorCTA />
    </>
  );
}
