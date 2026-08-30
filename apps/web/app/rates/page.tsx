import type { Metadata } from 'next';
import { RATE_TABLES } from '@sgo/engine';
import { RateTable } from '../../components/ui/RateTable';
import { Callout } from '../../components/ui/Callout';

export const metadata: Metadata = {
  title: 'Allowance rates for 2026/27',
  description:
    'The fostering national minimum allowance for England, Wales and Northern Ireland, and the Scottish Recommended Allowance, for 2026/27 — with previous years.',
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
        Rates change on <strong>1 April</strong> every year. Benefit rates — Child Benefit,
        Guardian&apos;s Allowance and the rest — change separately, in the first full week of April.
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
        <p style={{ marginBottom: 0 }}>
          We are not publishing Welsh figures yet. In the sources available to us, the 0–4 rate is
          higher than the 5–15 rate, which does not match the pattern anywhere else and looks like a
          transcription error. We are checking it against the Welsh Government&apos;s own table. A
          wrong figure here would be worse than none.
        </p>
      </Callout>

      {historic.length > 0 && (
        <>
          <h2>Previous years</h2>
          {historic.map((t) =>
            t.status === 'PENDING_SOURCE' ? (
              <div key={t.financialYear}>
                <h3>{t.financialYear.replace('-', '/')}</h3>
                <Callout type="info">
                  <p style={{ marginBottom: 0 }}>
                    We do not hold verified rates for {t.financialYear.replace('-', '/')}. We will
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
