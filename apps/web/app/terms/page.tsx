import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The terms on which this site is provided.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms of use</h1>

      <h2>What you can expect from us</h2>
      <p>
        This site is free to use. We try to keep it accurate and up to date, we say where every
        figure comes from, and we tell you when we do not know something rather than guessing.
      </p>

      <h2>What we cannot promise</h2>
      <p>
        We cannot promise the site is available at all times, that it is free of errors, or that the
        figures reflect what your council will actually decide. It provides general information, not
        advice about your situation. See the <a href="/disclaimer">disclaimer</a>.
      </p>

      <h2>Using our content</h2>
      <p>
        You are welcome to print a result, save it as a PDF, and give it to your council, your
        social worker, an adviser or anyone else. That is what it is for.
      </p>
      <p>
        If you would like to reproduce our guides, or embed the calculator on an advice
        organisation&apos;s website, please <a href="/contact">get in touch</a>. We would rather
        say yes and help you keep it current than have an out-of-date copy circulating.
      </p>

      <h2>Linking to us</h2>
      <p>You may link to any page here without asking.</p>

      <h2>Corrections</h2>
      <p>
        If you think something here is wrong, please tell us. Our{' '}
        <a href="/contact">corrections policy</a> sets out how we handle that and how quickly.
      </p>

      <h2>Changes</h2>
      <p>
        We update these terms from time to time. The date at the bottom of each guide tells you when
        it was last reviewed.
      </p>
    </>
  );
}
