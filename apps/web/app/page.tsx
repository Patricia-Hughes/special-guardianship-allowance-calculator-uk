import type { Metadata } from 'next';
import { CalculatorShell } from '../components/calculator/CalculatorShell';
import { RateTable } from '../components/ui/RateTable';
import { Disclaimer } from '../components/ui/Disclaimer';
import { AdviceLines } from '../components/ui/AdviceLines';
import { AUTHOR_NAME, ID, JsonLd, calculatorNode, pageGraph } from '../lib/jsonLd';

export const metadata: Metadata = {
  title: 'Special guardianship allowance calculator, what your council should be paying',
  description:
    'Work out the maximum special guardianship allowance your council should be starting from, in under a minute. Free, private, and with the law behind every figure.',
  alternates: { canonical: '/' },
  // This preserves the live token. To change it, use Google's verification meta
  // tag. In the upload ZIP, replace every occurrence of this token in index.html.
  verification: { google: 'hHIyhvz6mm9dPR0GIX7ACKfC6iGduOaakQUoAqrJFbA' },
};

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={pageGraph({
          path: '/',
          name: 'Special guardianship allowance calculator',
          description: String(metadata.description),
          mainEntity: ID.calculator,
          extra: [calculatorNode],
        })}
      />

      <h1>Special guardianship allowance calculator</h1>

      <p className="lede">
        Under the statutory guidance, your council is supposed to start from the fostering allowance
        for a child that age. This shows you that figure, the rule it comes from, and what to ask if
        your council started somewhere else.
      </p>

      <ul>
        <li>Free, and there is nothing to sign up for.</li>
        <li>
          Everything is worked out inside your own browser. Nothing you type is sent anywhere.
        </li>
        <li>Every figure has its source next to it, so you can check it or show someone.</li>
      </ul>

      <p>
        My name is {AUTHOR_NAME}. I am a special guardian myself, and nobody would show me the sum
        behind my own figure, so I built the table I needed.{' '}
        <a href="/about">More about me, and where the figures come from</a>.
      </p>

      <Disclaimer compact />

      <CalculatorShell />

      {/*
        Tier 3 (§32): with JavaScript disabled the calculator cannot run, but the
        rate tables and every guide still render. There is no excuse for a blank
        page on a static site.
      */}
      <noscript>
        <div className="callout callout--important">
          <p>
            <strong>The calculator needs JavaScript</strong>, which is switched off in your browser.
            The full rate tables are below, and every guide on this site works without it.
          </p>
        </div>
      </noscript>

      <section className="section" aria-labelledby="rates-heading">
        <h2 id="rates-heading">The national minimum allowance, 2026/27</h2>
        <p>
          These are the fostering national minimum allowances. They matter to you because the
          statutory guidance makes the core fostering allowance the starting point for a special
          guardianship allowance.
        </p>
        <RateTable nation="england" />
        <p>
          <a href="/rates">See the rates for every nation, and previous years</a>
        </p>
      </section>

      <section className="section" aria-labelledby="how-heading">
        <h2 id="how-heading">How councils are supposed to decide</h2>
        <ol>
          <li>
            <strong>Start with the fostering allowance.</strong> Not an adoption allowance, and not
            a percentage of anything. <a href="/guidance/what-your-council-must-consider">More</a>
          </li>
          <li>
            <strong>Consider your circumstances and the child&apos;s needs.</strong> A means test is
            allowed. A blanket rule applied without thought is not.{' '}
            <a href="/guidance/how-the-means-test-works">More</a>
          </li>
          <li>
            <strong>Give you the decision and its reasons.</strong> In writing, and reviewed every
            year. <a href="/guidance/annual-reviews">More</a>
          </li>
        </ol>
      </section>

      <AdviceLines headingId="advice-lines-page" />
    </>
  );
}
