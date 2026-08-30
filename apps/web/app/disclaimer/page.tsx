import type { Metadata } from 'next';
import { AdviceLines } from '../../components/ui/AdviceLines';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description: 'What this site is, what it is not, and the limits of what any calculator can tell you.',
  alternates: { canonical: '/disclaimer' },
};

export default function DisclaimerPage() {
  return (
    <>
      <h1>Disclaimer</h1>

      <h2>This is not legal advice</h2>
      <p>
        Nothing on this site is legal advice, and using it does not create any professional
        relationship. It gives general information about how special guardianship allowances are
        supposed to be decided. It cannot tell you what will happen in your case.
      </p>

      <h2>Every figure is an estimate</h2>
      <p>
        Financial support for special guardians is <strong>discretionary</strong>. There is no fixed
        amount you are entitled to. What the calculator shows you is the figure the statutory
        guidance says your council should be starting from — not a figure you can require it to pay.
      </p>
      <p>
        A council can lawfully pay less than the maximum after properly assessing your
        circumstances. What it should not do is start from the wrong figure, or apply a blanket rule
        without considering your case.
      </p>

      <h2>What we do not know about your council</h2>
      <p>
        Unless the result said otherwise, the calculator uses national minimum figures for your
        area. It does not know your council&apos;s own policy, its enhancement rates, or how it
        applies its means test. Those vary a great deal.
      </p>

      <h2>Where our data has gaps, we say so</h2>
      <p>
        We do not publish figures we have not verified against their original source, and we do not
        work missing figures out from percentages. That is why some things this site could plausibly
        offer — Welsh rates, backdating across 2024/25 — are not here yet. A number that looks
        precise and is slightly wrong is worse than no number, because you might take it to your
        council.
      </p>

      <h2>Rates change</h2>
      <p>
        Allowance rates change on 1 April each year and benefit rates change a few days later. Check
        the date on any page before you rely on it. If our rates are out of date, a banner at the
        top of every page will tell you.
      </p>

      <h2>Please check anything that matters</h2>
      <p>
        If something here could affect a decision about money or about your child, check it with an
        adviser before you act on it.
      </p>

      <AdviceLines />
    </>
  );
}
