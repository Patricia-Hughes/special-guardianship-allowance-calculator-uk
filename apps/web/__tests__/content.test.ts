/** Content system — spec §26. */

import { describe, expect, it } from 'vitest';
import {
  allContent,
  contentSlugs,
  durationToDays,
  isOverdueForReview,
  readContent,
  relatedPages,
} from '../lib/content';

describe('content system', () => {
  it('reads every guidance page with valid frontmatter', () => {
    const docs = allContent('guidance');
    expect(docs.length).toBeGreaterThanOrEqual(16);
    for (const d of docs) {
      expect(d.frontmatter.title).toBeTruthy();
      expect(d.frontmatter.description).toBeTruthy();
      expect(d.frontmatter.citations.length).toBeGreaterThan(0);
      expect(d.body.length).toBeGreaterThan(200);
    }
  });

  it('every flag action URL has a page behind it', () => {
    // A flag that links nowhere is worse than no flag: the carer clicks through
    // from the one thing that mattered on the page and lands on a 404.
    const slugs = new Set(contentSlugs('guidance'));
    const linked = [
      'child-benefit-deduction',
      'fixed-percentage-policies',
      'what-your-council-must-consider',
      'complaining-to-the-ombudsman',
      'former-foster-carers',
      'who-can-get-an-allowance',
      'kinship-zones',
      'enhancements-for-additional-needs',
      'how-the-means-test-works',
      'annual-reviews',
      'which-council-is-responsible',
      'turning-18',
      'benefits-and-your-allowance',
      'rates',
      'asking-for-the-policy',
      'scotland-kinship-care',
    ];
    for (const slug of linked) {
      expect(slugs.has(slug), `flag links to /guidance/${slug}, which does not exist`).toBe(true);
    }
  });

  it('derives related pages from shared citations, not a hand-maintained list', () => {
    const all = allContent('guidance');
    const doc = readContent('guidance', 'former-foster-carers')!;
    const related = relatedPages(doc, all);
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((r) => r.frontmatter.slug !== 'former-foster-carers')).toBe(true);
    // Every related page genuinely shares a citation.
    const mine = new Set(doc.frontmatter.citations);
    for (const r of related) {
      expect(r.frontmatter.citations.some((c) => mine.has(c))).toBe(true);
    }
  });

  it('parses review intervals', () => {
    expect(durationToDays('P6M')).toBe(180);
    expect(durationToDays('P1Y')).toBe(365);
    expect(durationToDays('P3M')).toBe(90);
    expect(durationToDays('nonsense')).toBe(365);
  });

  it('flags a page as overdue once its review interval has passed', () => {
    const fm = { lastReviewed: '2026-01-01', reviewEvery: 'P3M' } as never;
    expect(isOverdueForReview(fm, new Date('2026-02-01'))).toBe(false);
    expect(isOverdueForReview(fm, new Date('2026-09-01'))).toBe(true);
  });

  it('returns null for a page that does not exist', () => {
    expect(readContent('guidance', 'no-such-page')).toBeNull();
  });
});
