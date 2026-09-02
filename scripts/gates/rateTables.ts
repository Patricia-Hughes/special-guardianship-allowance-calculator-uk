/**
 * The gates over the rate tables themselves.
 *
 * A transcription error in a rate table is the highest-impact defect this
 * product can ship: legally wrong information handed to someone in financial
 * crisis, wearing the authority of a citation.
 *
 *   2  rates rise with age, and the bands cover 0 to 17 without a gap
 *   3  no rate outside £50 to £600 a week
 *   4  no year-on-year change outside 0 to 15%, and no gap between years
 *  12  a nation whose figures are doubted must not have its route switched on
 */

import { NATIONS, rateSets, type GateContext, type RateDoc, type RateSection } from './context';

const MIN_WEEKLY_PENCE = 5000; // £50/wk
const MAX_WEEKLY_PENCE = 60000; // £600/wk
const MAX_UPLIFT_PERCENT = 15;

/**
 * A nation whose rates are marked `verify: true` may ship: the spec keeps the
 * figures rather than inventing corrected ones. But its route must be behind a
 * feature flag that is off. Holding suspect data is allowed; serving it is not.
 */
const ROUTE_FLAG_FOR_NATION: Record<string, string> = {
  wales: 'WALES_ROUTE_ENABLED',
};

const published = (docs: Map<string, RateDoc>): Array<[string, RateDoc]> =>
  [...docs].filter(([, doc]) => doc.status !== 'PENDING_SOURCE');

// ─── 2 and 3: within one table ─────────────────────────────────────────────

export function checkRateShape({ rateDocs, report }: GateContext): void {
  for (const [file, doc] of published(rateDocs)) {
    for (const set of rateSets(doc)) {
      const ordered = [...set.bands].sort((a, b) => a.minAge - b.minAge);

      let previous = -1;
      let previousBand = '';
      for (const band of ordered) {
        const value = set.rates[band.id];
        if (value === undefined) {
          report.fail('2 monotonic', `${file} ${set.label} has no rate for band ${band.id}`);
          continue;
        }

        if (value < previous) {
          const message =
            `${file} ${set.label}: band ${band.id} (${value}p) is lower than ${previousBand} (${previous}p). ` +
            'Rates must not fall as age rises, this is usually a transcription error.';
          if (set.anomalyConfirmed) {
            // Established as genuinely published. This no longer requires
            // verify: true, because verify means "we doubt this figure" and a
            // primary source removes the doubt without removing the oddity.
            // Wales is the case: the Welsh Government's own circular prints the
            // younger band higher. Gate 12 still insists on the corroboration
            // and on the line shown to the reader.
            report.note(`${message} Corroborated as genuinely published, and served with an explanation.`);
          } else if (set.unverified) {
            report.note(`${message} Marked verify: true, so the route must stay disabled.`);
          } else {
            report.fail('2 monotonic', message);
          }
        }
        previous = value;
        previousBand = band.id;

        if (value < MIN_WEEKLY_PENCE || value > MAX_WEEKLY_PENCE) {
          report.fail(
            '3 sanity',
            `${file} ${set.label} ${band.id} = ${value}p, outside £50 to £600/wk. Pounds entered as pence?`,
          );
        }
      }

      // The bands must tile 0 to 17 exactly: a gap is an age with no rate.
      let expected = 0;
      for (const band of ordered) {
        if (band.minAge !== expected) {
          report.fail(
            '2 monotonic',
            `${file} ${set.label}: age band ${band.id} starts at ${band.minAge}, expected ${expected}`,
          );
        }
        if (band.maxAge < band.minAge) {
          report.fail('2 monotonic', `${file} ${set.label}: age band ${band.id} ends before it starts`);
        }
        expected = band.maxAge + 1;
      }
      if (expected !== 18) {
        report.fail('2 monotonic', `${file} ${set.label}: age bands cover 0 to ${expected - 1}, not 0 to 17`);
      }
    }
  }
}

// ─── 4: between tables ─────────────────────────────────────────────────────

export function checkYearOnYear({ rateDocs, report }: GateContext): void {
  const byYear = published(rateDocs).sort((a, b) =>
    a[1].financialYear.localeCompare(b[1].financialYear),
  );

  for (let i = 1; i < byYear.length; i++) {
    const [previousFile, previousDoc] = byYear[i - 1]!;
    const [file, doc] = byYear[i]!;
    const before = new Map(rateSets(previousDoc).map((s) => [s.label, s]));

    for (const set of rateSets(doc)) {
      const prior = before.get(set.label);
      if (!prior) continue;
      for (const band of set.bands) {
        const now = set.rates[band.id];
        const then = prior.rates[band.id];
        if (now === undefined || then === undefined || then === 0) continue;
        const uplift = ((now - then) / then) * 100;
        if (uplift < 0 || uplift > MAX_UPLIFT_PERCENT) {
          report.fail(
            '4 uplift',
            `${file} ${set.label} ${band.id}: ${uplift.toFixed(2)}% change from ${previousFile}. ` +
              `Expected 0 to ${MAX_UPLIFT_PERCENT}%. Verify against the source document before merging.`,
          );
        }
      }
    }
  }

  // A gap between two tables is a date with no rates at all.
  const all = [...rateDocs.values()].sort((a, b) => a.financialYear.localeCompare(b.financialYear));
  for (let i = 1; i < all.length; i++) {
    const previous = all[i - 1]!;
    const current = all[i]!;
    if (!previous.effectiveTo || !current.effectiveFrom) continue;
    const dayAfter = new Date(`${previous.effectiveTo}T00:00:00Z`);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
    if (dayAfter.toISOString().slice(0, 10) !== current.effectiveFrom) {
      report.fail(
        '4 uplift',
        `Rate tables are not contiguous: ${previous.financialYear} ends ${previous.effectiveTo}, ` +
          `${current.financialYear} starts ${current.effectiveFrom}. A gap means a date with no rates.`,
      );
    }
  }
}

// ─── 12: doubted figures must not be served ────────────────────────────────

/**
 * An odd-looking figure has two quite different states, and conflating them
 * either strands a whole nation or ships a number nobody has checked.
 *
 *   verify: true alone        suspect. Hold the data, do not serve it.
 *   + anomalyConfirmed: true  independently corroborated. May be served,
 *                             because the alternative is telling every carer in
 *                             that nation nothing at all.
 *
 * Confirming an anomaly is deliberately expensive: two independent
 * corroborating sources, and a plain-English line shown to the reader, because
 * a figure that looks wrong reads as a bug in the site unless we say otherwise.
 */
export function checkUnverifiedRoutes(ctx: GateContext): void {
  const { rateDocs, report } = ctx;
  const featureFlags = ctx.sourceOf('packages', 'engine', 'src', 'featureFlags.ts');

  for (const [, doc] of published(rateDocs)) {
    for (const nation of NATIONS) {
      const section = doc[nation] as RateSection | null | undefined;
      if (!section) continue;
      // Either state brings a section in here, and a section must not escape
      // the requirements below simply by dropping verify.
      if (section.verify !== true && section.anomalyConfirmed !== true) continue;

      if (section.verify === true && !section.verifyNote) {
        report.fail(
          '12 verify',
          `${nation} rates are marked verify: true with no verifyNote saying what to check`,
        );
      }

      const flagName = ROUTE_FLAG_FOR_NATION[nation];
      if (!flagName && section.verify === true) {
        report.fail(
          '12 verify',
          `${nation} rates are marked verify: true but no route flag is defined for that nation`,
        );
        continue;
      }
      const routeEnabled = flagName ? new RegExp(`${flagName}:\\s*true`).test(featureFlags) : true;

      if (section.anomalyConfirmed === true) {
        const sources = section.anomalyCorroboration ?? [];
        if (sources.length < 2) {
          report.fail(
            '12 verify',
            `${nation} rates are marked anomalyConfirmed: true with ${sources.length} corroborating source(s). ` +
              'Confirming an anomaly takes at least two independent sources.',
          );
        }
        for (const source of sources) {
          if (!source.url || !source.finding) {
            report.fail(
              '12 verify',
              `${nation} anomalyCorroboration entry "${source.source ?? '?'}" needs both a url and a finding`,
            );
          }
        }
        if (!section.userFacingNote) {
          report.fail(
            '12 verify',
            `${nation} rates are marked anomalyConfirmed: true with no userFacingNote. ` +
              'A rate that looks wrong must be explained on screen, or carers will read it as a bug.',
          );
        }
        report.note(
          `${nation} rates carry a confirmed anomaly, corroborated by ${sources.length} sources` +
            `${flagName ? `; ${flagName} may be on` : ''}. ` +
            (section.verify === true
              ? 'Primary source still outstanding.'
              : 'Confirmed against a primary source.'),
        );
      } else if (routeEnabled) {
        report.fail(
          '12 verify',
          `${nation} rates are marked verify: true but ${flagName} is true. ` +
            'Unverified rates must not be served, confirm them against the original source first, ' +
            'or corroborate the anomaly and set anomalyConfirmed.',
        );
      } else {
        report.note(`${nation} rates are unverified; ${flagName} is off, so the route is not served.`);
      }
    }
  }
}
