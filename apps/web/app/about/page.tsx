import type { Metadata } from 'next';
import { allContent } from '../../lib/content';
import { LA_REGION_MAP } from '@sgo/engine';

export const metadata: Metadata = {
  title: 'About this site and how we source it',
  description: 'Who writes this, where the figures come from, how often it is reviewed, and what we deliberately do not publish.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  const guides = allContent('guidance');
  return (
    <>
      <h1>About this site</h1>

      <p style={{ fontSize: '1.15rem' }}>
        Most special guardians are paid less than they should be. Not usually because anyone
        intended it, but because councils apply blanket policies that have repeatedly been found
        wrong, and because almost nobody being paid too little knows what the right figure looks
        like.
      </p>
      <p>This site exists to close that gap.</p>

      <h2>Our editorial policy</h2>

      <h3>Every figure traces to a source</h3>
      <p>
        Rates live in versioned data files with an effective date, not in the text of a page. When
        the April uprating lands, every figure across the site changes at once. A number typed into
        prose goes silently wrong every April, so our build refuses to accept one.
      </p>

      <h3>We do not publish what we have not verified</h3>
      <p>
        Where we cannot confirm a figure against its original source, we leave it out and say why.
        That is why we currently publish no Welsh rates, and no 2024/25 table. Working a historic
        rate out from an uplift percentage would give a number that looks precise and could be
        wrong by a few pounds — and a few pounds across two years is exactly what gets a
        carer&apos;s complaint dismissed.
      </p>

      <h3>We do not name a council without a source</h3>
      <p>
        Saying what a particular council does — especially where an Ombudsman has criticised it —
        requires a stored, dated, public source. Where we hold information about a council but have
        not re-sourced the link, our calculator ignores it entirely and uses the national figures
        instead. We currently cover {Object.keys(LA_REGION_MAP).length} English authorities for
        regional rates.
      </p>

      <h3>Our checks run before anything is published</h3>
      <ul>
        <li>Rates must rise with age, sit in a sane range, and move plausibly year on year.</li>
        <li>Legal test cases covering the rules that must never break are run on every change, and cannot be skipped.</li>
        <li>The calculator refuses to output a fixed percentage of the fostering rate, ever.</li>
        <li>If our rates go past their end date, a warning appears on every page automatically.</li>
      </ul>

      <h3>Review schedule</h3>
      <p>
        Each of our {guides.length} guides carries a &ldquo;last reviewed&rdquo; date and a review
        interval, and we are told when one falls overdue. Rate data is reviewed every April; the
        Kinship Zones pilot every three months; council information annually.
      </p>

      <h2>What we are not</h2>
      <p>
        We are not a law firm, a charity, or part of any council or government department. We do not
        give advice on individual cases. Where your situation needs that, the advice organisations
        we point to throughout the site can help, and they are independent of us.
      </p>

      <h2>Corrections</h2>
      <p>
        If we have something wrong, we want to know. See our{' '}
        <a href="/contact">corrections policy</a>.
      </p>
    </>
  );
}
