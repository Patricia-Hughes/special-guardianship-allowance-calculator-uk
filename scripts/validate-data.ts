/**
 * Data integrity CI gate, spec §9.
 *
 * Every one of these fails the build. A transcription error in a rate table is
 * the highest-impact defect this product can ship: it is legally wrong
 * information handed to someone in financial crisis, and it looks authoritative.
 *
 * Each gate is a function of the loaded data in scripts/gates/. They record
 * rather than throw, so one run reports everything that is wrong instead of
 * stopping at the first thing; fixing data one CI run at a time is miserable.
 * Adding a gate means adding a file and a line to the list below.
 */

import { loadContext } from './gates/context';
import { checkClaimSources } from './gates/claims';
import { checkCitedIds, checkDataSourceIds } from './gates/citations';
import {
  checkCouncilSources,
  checkFixedPercentage,
  checkLawfulnessFindings,
  checkLivingCosts,
  checkRegionCoverage,
} from './gates/councils';
import { checkIntegerPence, checkPendingSources } from './gates/integrity';
import { checkRateShape, checkUnverifiedRoutes, checkYearOnYear } from './gates/rateTables';
import { checkSchemas } from './gates/schema';

const GATES = [
  checkSchemas,
  checkRateShape,
  checkYearOnYear,
  checkUnverifiedRoutes,
  checkRegionCoverage,
  checkCouncilSources,
  checkLawfulnessFindings,
  checkFixedPercentage,
  checkLivingCosts,
  checkCitedIds,
  checkDataSourceIds,
  checkPendingSources,
  checkIntegerPence,
  checkClaimSources,
];

const ctx = loadContext();
for (const gate of GATES) gate(ctx);

const { failures, notes } = ctx.report;

if (notes.length > 0) {
  console.log('Notes:');
  for (const n of [...new Set(notes)].sort()) console.log(`  · ${n}`);
  console.log('');
}

if (failures.length > 0) {
  console.error(`validate-data: ${failures.length} failure(s)\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`validate-data: all checks passed across ${ctx.dataFiles.length} data files.`);
