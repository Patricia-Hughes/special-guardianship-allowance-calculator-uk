/**
 * Gate 18: every warning and letter that makes a claim carries a source.
 *
 * A warning shown on a result is a claim to a carer, so it needs a source for
 * the same reason a guidance page does. Covering the pages and the data and
 * stopping there is how an unsourced legal assertion reaches a result page
 * without anything objecting, which is exactly what happened.
 */

import type { GateContext } from './context';

/**
 * The exceptions, listed by name rather than inferred, so adding one is a
 * decision somebody makes on purpose and has to write a reason for.
 */
const WARNINGS_WITHOUT_A_SOURCE = new Map<string, string>([
  ['LGSCO_FINDING_AGAINST_LA', 'its source is the specific decision, passed in per council'],
  ['LGSCO_FINDING_FORMER_POLICY', 'same, the decision is per council'],
  ['LA_POLICY_UNDER_REVIEW', "it reports the council's own words about its own policy"],
  ['RATES_STALE', 'it describes the state of this site, not the law'],
]);

const CATALOGUE_ENTRY = /^ {2}([A-Z][A-Z_0-9]+): \{(.*?)^ {2}\},/gms;
const LETTER_ENTRY = /^ {2}'([a-z0-9-]+)': \{(.*?)^ {2}\},/gms;

export function checkClaimSources(ctx: GateContext): void {
  const { report } = ctx;

  // flagCatalogue.ts, not flags.ts: the warning wording moved into its own file
  // and this gate has to follow it, or it reads a file with no warnings in it
  // and passes without checking anything.
  const flags = ctx.sourceOf('packages', 'engine', 'src', 'flagCatalogue.ts');
  const catalogue = flags.slice(flags.indexOf('FLAG_CATALOGUE'));
  for (const [, code, body] of catalogue.matchAll(CATALOGUE_ENTRY)) {
    const hasCitation = /citationId:/.test(body!);
    const exempt = WARNINGS_WITHOUT_A_SOURCE.has(code!);
    if (!hasCitation && !exempt) {
      report.fail(
        '18 warning sources',
        `flagCatalogue.ts "${code}" makes a claim to a carer with no citationId. Give it one, or add it to ` +
          'WARNINGS_WITHOUT_A_SOURCE in this script with the reason it does not need one.',
      );
    }
    if (hasCitation && exempt) {
      report.fail(
        '18 warning sources',
        `flagCatalogue.ts "${code}" now has a citationId but is still listed as not needing one. Remove it ` +
          'from WARNINGS_WITHOUT_A_SOURCE.',
      );
    }
  }

  // templates.ts, not index.ts: the letter wording moved into its own file and
  // this gate has to follow it, or it reads a file with no letters in it and
  // passes without checking anything.
  const letters = ctx.sourceOf('packages', 'letters', 'src', 'templates.ts');
  for (const [, template, body] of letters.matchAll(LETTER_ENTRY)) {
    const ids = /citationIds:\s*\[([^\]]*)\]/.exec(body!);
    if (!ids || ids[1]!.trim() === '') {
      report.fail(
        '18 warning sources',
        `letters "${template}" cites nothing. Every letter states a position.`,
      );
    }
  }
}
