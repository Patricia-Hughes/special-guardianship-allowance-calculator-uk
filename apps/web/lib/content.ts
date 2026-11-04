/**
 * Content system — spec §26.
 *
 * Guidance pages are MDX with typed frontmatter, so the writer works in prose
 * and the components stay in code. Read at build time only: this module is
 * never bundled into a client component.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const CONTENT_DIR = join(process.cwd(), 'content');

export interface Frontmatter {
  title: string;
  slug: string;
  description: string;
  /** Original publication date, preserved when a guide is edited. */
  datePublished?: string;
  lastUpdated: string;
  lastReviewed: string;
  /** ISO 8601 duration, e.g. P6M. */
  reviewEvery: string;
  ratesFinancialYear?: string;
  citations: string[];
  relatedLetters?: string[];
  faq?: Array<{ q: string; a: string }>;
  /** Set to keep a page out of the build and the sitemap. */
  draft?: boolean;
}

export interface ContentDoc {
  frontmatter: Frontmatter;
  body: string;
}

export function contentSlugs(kind: 'guidance' | 'la'): string[] {
  const dir = join(CONTENT_DIR, kind);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''));
}

export function readContent(kind: 'guidance' | 'la', slug: string): ContentDoc | null {
  const path = join(CONTENT_DIR, kind, `${slug}.mdx`);
  if (!existsSync(path)) return null;
  const { data, content } = matter(readFileSync(path, 'utf8'));
  return { frontmatter: data as Frontmatter, body: content };
}

export function allContent(kind: 'guidance' | 'la'): ContentDoc[] {
  return contentSlugs(kind)
    .map((slug) => readContent(kind, slug))
    .filter((d): d is ContentDoc => d !== null && !d.frontmatter.draft)
    .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));
}

/**
 * Related pages are DERIVED from shared citations, not hand-maintained (§27).
 * Two pages that rest on the same authority are related by definition, and the
 * link never goes stale when a page is renamed.
 */
export function relatedPages(doc: ContentDoc, all: ContentDoc[], limit = 4): ContentDoc[] {
  const mine = new Set(doc.frontmatter.citations ?? []);
  return all
    .filter((d) => d.frontmatter.slug !== doc.frontmatter.slug)
    .map((d) => ({
      doc: d,
      shared: (d.frontmatter.citations ?? []).filter((c) => mine.has(c)).length,
    }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.doc.frontmatter.title.localeCompare(b.doc.frontmatter.title))
    .slice(0, limit)
    .map((x) => x.doc);
}

/** Parse an ISO 8601 duration like P6M or P1Y into whole days, approximately. */
export function durationToDays(iso: string): number {
  const m = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/.exec(iso);
  if (!m) return 365;
  const [, y = '0', mo = '0', d = '0'] = m;
  return Number(y) * 365 + Number(mo) * 30 + Number(d);
}

export function isOverdueForReview(fm: Frontmatter, today = new Date()): boolean {
  const reviewed = Date.parse(`${fm.lastReviewed}T00:00:00Z`);
  if (Number.isNaN(reviewed)) return true;
  const dueDays = durationToDays(fm.reviewEvery);
  return (today.getTime() - reviewed) / 86_400_000 > dueDays;
}
