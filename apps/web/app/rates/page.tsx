import type { Metadata } from 'next';
import { RATE_TABLES } from '@sgo/engine';
import { RateTable } from '../../components/ui/RateTable';
import { Callout } from '../../components/ui/Callout';

export const metadata: Metadata = {
  title: 'Allowance rates for 2026/27',
  description:
    'The fostering national minimum allowance for England, Wales and Northern Ireland, and the Scottish Recommended Allowance, for 2026/27, with previous years.',
  alternates: { canonical: '/rates' },
};

export default function RatesPage() {
  const current = RATE_TABLES.find((t) => t.status !== 'PENDING_SOURCE');
  const historic = RATE_TABLES.filter((t) => t !== current);

  return (
    <>
      <h1>Allowance rates</h1>
      <p>
        These are the fostering minimum allowances each nation publishes. They matter to special
        guardians because the statutory guidance treats the core fostering allowance as the starting
        point for a special guardianship allowance.
      </p>
      <p>
        Councils normally raise allowance rates on <strong>1 April</strong> every year. The
        government states those same rates for a tax year beginning 6 April. Benefit rates, meaning
        Child Benefit, Guardian&apos;s Allowance and the rest, change separately, in the first full
        week of April.
      </p>

      <h2>England</h2>
      <RateTable nation="england" />

      <h2>Scotland</h2>
      <p>
        Scotland does not have special guardianship orders. Kinship carers are covered by the
        Scottish Recommended Allowance, which is a <strong>minimum</strong> and applies equally to
        foster and kinship carers.
      </p>
      <RateTable nation="scotland" />

      <h2>Northern Ireland</h2>
      <RateTable nation="northern-ireland" />

      <h2>Wales</h2>
      <Callout type="important">
        <p>
          In Wales the rate for a child <strong>under 5 is higher</strong> than for a child aged 5
          to 15. That is the opposite of every other table on this page, so it looks like a mistake.
          It is how the rates are published, though.
        </p>
        <p className="flush-bot">
          The Welsh Government&apos;s own circular for an earlier year prints them that way, so the
          pattern itself is settled. This year&apos;s figures come from a table reproducing that
          circular, because the letter for this year has not been published anywhere I can find. So
          I am telling you rather than quietly &ldquo;correcting&rdquo; a government figure.
        </p>
      </Callout>
      <RateTable nation="wales" />

      {historic.length > 0 && (
        <>
          <h2>Previous years</h2>
          {historic.map((t) =>
            t.status === 'PENDING_SOURCE' ? (
              <div key={t.financialYear}>
                <h3>{t.financialYear.replace('-', '/')}</h3>
                <Callout type="info">
                  <p className="flush-bot">
                    I do not hold verified rates for {t.financialYear.replace('-', '/')}. I will
                    not work them backwards from the uplift percentage, because the rounding rules
                    are not published and a wrong historic rate would produce a wrong backdating
                    claim.
                  </p>
                </Callout>
              </div>
            ) : (
              <div key={t.financialYear}>
                <h3>{t.financialYear.replace('-', '/')}</h3>
                <RateTable nation="england" year={t.financialYear} />
              </div>
            ),
          )}
        </>
      )}
    </>
  );
}
