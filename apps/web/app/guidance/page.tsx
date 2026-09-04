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
      <p className="lede">
        I wrote these to be read once, quickly. Every legal point has its source next to it, so you
        can check it or show it to someone.
      </p>
      <ul className="cards">
        {docs.map((d) => (
          <li key={d.frontmatter.slug}>
            <a className="card" href={`/guidance/${d.frontmatter.slug}`}>
              <span className="card__title">{d.frontmatter.title}</span>
              <span className="card__meta">{d.frontmatter.description}</span>
            </a>
          </li>
        ))}
      </ul>
      <CalculatorCTA />
    </>
  );
}
