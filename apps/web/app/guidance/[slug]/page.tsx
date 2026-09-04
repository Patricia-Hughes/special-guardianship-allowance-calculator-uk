import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { cite } from '@sgo/engine';
import { allContent, contentSlugs, readContent, relatedPages } from '../../../lib/content';
import { mdxComponents } from '../../../components/ui/mdxComponents';
import { LastUpdated } from '../../../components/ui/LastUpdated';
import { Disclaimer } from '../../../components/ui/Disclaimer';
import { AdviceLines } from '../../../components/ui/AdviceLines';
import { CitationsList } from '../../../components/ui/SourceLink';
import { AUTHOR_NAME, ID, JsonLd, articleNode, faqNode, pageGraph } from '../../../lib/jsonLd';

export function generateStaticParams(): Array<{ slug: string }> {
  return contentSlugs('guidance').map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = readContent('guidance', slug);
  if (!doc) return {};
  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
    alternates: { canonical: `/guidance/${slug}` },
    openGraph: { title: doc.frontmatter.title, description: doc.frontmatter.description },
  };
}

export default async function GuidancePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = readContent('guidance', slug);
  if (!doc || doc.frontmatter.draft) notFound();

  const fm = doc.frontmatter;
  const citations = (fm.citations ?? []).map(cite);
  const related = relatedPages(doc, allContent('guidance'));

  return (
    <article>
      <JsonLd
        data={pageGraph({
          path: `/guidance/${slug}`,
          name: fm.title,
          description: fm.description,
          trail: [
            { name: 'Guides', url: '/guidance' },
            { name: fm.title, url: `/guidance/${slug}` },
          ],
          datePublished: fm.lastUpdated,
          dateModified: fm.lastUpdated,
          lastReviewed: fm.lastReviewed,
          mainEntity: ID.article(slug),
          extra: [
            articleNode({
              slug,
              title: fm.title,
              description: fm.description,
              published: fm.lastUpdated,
              modified: fm.lastUpdated,
              citations,
              about: ['Special guardianship allowance', fm.title],
            }),
            ...(fm.faq && fm.faq.length > 0 ? [faqNode(slug, fm.faq)] : []),
          ],
        })}
      />

      <nav aria-label="Breadcrumb" className="print-hide">
        <a href="/guidance">← All guides</a>
      </nav>

      <h1>{fm.title}</h1>
      <LastUpdated
        author={AUTHOR_NAME}
        updated={fm.lastUpdated}
        reviewed={fm.lastReviewed}
        {...(fm.ratesFinancialYear ? { ratesFinancialYear: fm.ratesFinancialYear } : {})}
      />

      <MDXRemote source={doc.body} components={mdxComponents} />

      {fm.faq && fm.faq.length > 0 && (
        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading">Common questions</h2>
          {fm.faq.map((item, i) => (
            <details key={i}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </section>
      )}

      <Disclaimer />
      <CitationsList citations={citations} />

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="print-hide">
          <h2 id="related-heading">Related guides</h2>
          <ul>
            {related.map((r) => (
              <li key={r.frontmatter.slug}>
                <a href={`/guidance/${r.frontmatter.slug}`}>{r.frontmatter.title}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AdviceLines />
    </article>
  );
}
