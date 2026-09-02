/**
 * Gates 10 and 11: what the data itself must never contain.
 *
 *  10  a PENDING_SOURCE marker without a tracked issue, which is how a gap
 *      stops being a gap somebody is working on and becomes one nobody sees
 *  11  money that is not a whole number of pence, because a float here becomes
 *      a rounding error in a figure a carer takes to their council
 */

import { rateSets, visit, type GateContext } from './context';

export function checkPendingSources({ docs, report }: GateContext): void {
  for (const [file, doc] of docs) {
    visit(doc, '', (obj, path) => {
      if (obj.status !== 'PENDING_SOURCE') return;
      const issue = obj.pendingSourceIssue;
      if (typeof issue !== 'string' || issue.length === 0) {
        report.fail('10 pending', `${file}${path} is PENDING_SOURCE with no pendingSourceIssue link`);
      } else {
        report.note(`${file}${path} is PENDING_SOURCE, tracked at ${issue}`);
      }
    });
  }
}

export function checkIntegerPence({ docs, rateDocs, report }: GateContext): void {
  for (const [file, doc] of docs) {
    visit(doc, '', (obj, path) => {
      for (const [key, value] of Object.entries(obj)) {
        if (!key.endsWith('Pence') || value === null) continue;
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          report.fail(
            '11 pence',
            `${file}${path}.${key} = ${JSON.stringify(value)} is not an integer number of pence`,
          );
        }
      }
    });
  }

  // Rate values are pence but are not named *Pence, so the sweep above misses
  // them. They are the figures that matter most.
  for (const [file, doc] of rateDocs) {
    for (const set of rateSets(doc)) {
      for (const [band, value] of Object.entries(set.rates)) {
        if (!Number.isInteger(value)) {
          report.fail(
            '11 pence',
            `${file} ${set.label} ${band} = ${value} is not an integer number of pence`,
          );
        }
      }
    }
  }
}
