/**
 * Staleness gate — spec §9.
 *
 *   WARN if any rates file effectiveTo is within 60 days (April uprating approaching)
 *   FAIL if today > effectiveTo of the newest rates file (rates are stale in production)
 *   WARN if any la-overrides verifiedOn is more than 365 days old
 *   WARN if kinship-zones lastVerified is more than 90 days old
 *
 * Shipping last year's rates without saying so is the failure mode this exists
 * to prevent. If the uplift is announced late, ship the old rates behind the
 * RATES_STALE banner rather than guessing (§37).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');

const readJson = (f: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(dataDir, f), 'utf8')) as Record<string, unknown>;

/** Overridable so CI can reproduce a date, and so tests are not clock-dependent. */
const today = (process.env.SGO_TODAY ?? new Date().toISOString().slice(0, 10)) as string;
const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

const warnings: string[] = [];
const failures: string[] = [];

// ── Rate tables ────────────────────────────────────────────────────────────
const rateFiles = readdirSync(dataDir).filter((f) => f.startsWith('rates.'));
const rateDocs = rateFiles
  .map((f) => ({ file: f, doc: readJson(f) }))
  .filter(({ doc }) => doc.status !== 'PENDING_SOURCE');

const newest = rateDocs
  .slice()
  .sort((a, b) => String(b.doc.effectiveTo).localeCompare(String(a.doc.effectiveTo)))[0];

if (!newest) {
  failures.push('No sourced rate table at all. The calculator cannot produce a figure.');
} else {
  const effectiveTo = String(newest.doc.effectiveTo);
  const daysLeft = daysBetween(today, effectiveTo);
  if (daysLeft < 0) {
    failures.push(
      `Rates are STALE in production: the newest table (${String(newest.doc.financialYear)}) ended ` +
        `${effectiveTo}, ${-daysLeft} days ago. Ship the new financial year, or the RATES_STALE ` +
        'banner if the uplift has not been announced. Never interpolate.',
    );
  } else if (daysLeft <= 60) {
    warnings.push(
      `The April uprating is approaching: ${String(newest.doc.financialYear)} rates end ${effectiveTo} ` +
        `in ${daysLeft} days. Open the tracking issue and start §37's runbook.`,
    );
  }
}

for (const { file, doc } of rateDocs) {
  const to = String(doc.effectiveTo);
  const daysLeft = daysBetween(today, to);
  if (daysLeft >= 0 && daysLeft <= 60) {
    warnings.push(`${file} ends in ${daysLeft} days (${to}).`);
  }
}

// ── LA overrides ───────────────────────────────────────────────────────────
interface LaEntry {
  slug: string;
  verifiedOn: string;
  publishable: boolean;
}
const overrides = readJson('la-overrides.json').authorities as LaEntry[];
for (const la of overrides) {
  const age = daysBetween(la.verifiedOn, today);
  if (age > 365) {
    warnings.push(
      `la-overrides "${la.slug}" was last verified ${la.verifiedOn} (${age} days ago). ` +
        'Re-verify against the council website — §41 says annually.',
    );
  }
}

// ── Kinship Zones ──────────────────────────────────────────────────────────
const zones = readJson('kinship-zones.json');
const zoneAge = daysBetween(String(zones.lastVerified), today);
if (zoneAge > 90) {
  warnings.push(
    `kinship-zones was last verified ${String(zones.lastVerified)} (${zoneAge} days ago). ` +
      'The pilot list and status need re-checking quarterly.',
  );
}

// ── Report ─────────────────────────────────────────────────────────────────
for (const w of warnings) console.warn(`  ⚠ ${w}`);

if (failures.length > 0) {
  console.error(`\ncheck-staleness: ${failures.length} failure(s)\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log(
  warnings.length > 0
    ? `\ncheck-staleness: passed with ${warnings.length} warning(s) (as at ${today}).`
    : `check-staleness: passed, nothing stale (as at ${today}).`,
);
