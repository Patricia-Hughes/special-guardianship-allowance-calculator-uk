/**
 * Performance budget gate — spec §31.
 *
 * The spec's purpose for this gate is stated plainly: "failing the build on
 * regression". So that is what it does — it measures the gzipped JavaScript a
 * supported browser actually downloads for each route and fails if it grows
 * past a recorded baseline.
 *
 * It also reports the gap to the spec's stated targets. Those targets are
 * currently unreachable with the mandated stack: Next.js App Router plus React
 * 19 costs roughly 113KB gzipped before a single line of application code, and
 * the calculator-route target is 120KB. The gap is tracked, not hidden — see
 * docs/DECISIONS.md ADR-0005.
 *
 * Scripts loaded with `nomodule` are excluded: no Tier 1 or Tier 2 browser in
 * §32 downloads them.
 */

import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'apps', 'web', 'out');
const baselinePath = join(root, 'apps', 'web', 'bundle-baseline.json');

/** Spec §31 targets, in gzipped bytes. */
const SPEC_TARGETS: Record<string, number> = {
  '/': 120_000,
  default: 50_000,
};
const TOTAL_PAGE_WEIGHT_TARGET = 400_000;

/** How much growth is a regression, over the recorded baseline. */
const REGRESSION_TOLERANCE = 1.02;

interface RouteMeasurement {
  route: string;
  jsGzip: number;
  cssGzip: number;
  htmlGzip: number;
  totalGzip: number;
}

const ROUTES: Array<{ route: string; file: string }> = [
  { route: '/', file: 'index.html' },
  { route: '/rates', file: 'rates.html' },
  { route: '/guidance', file: 'guidance.html' },
];

function measure(route: string, file: string): RouteMeasurement | null {
  const htmlPath = join(outDir, file);
  if (!existsSync(htmlPath)) return null;
  const html = readFileSync(htmlPath, 'utf8');

  // Only assets a modern browser actually fetches: skip `nomodule` scripts.
  const scripts = [...html.matchAll(/<script([^>]*)>/g)]
    .filter((m) => !/nomodule/i.test(m[1] ?? ''))
    .map((m) => /src="([^"]+)"/.exec(m[1] ?? '')?.[1])
    .filter((s): s is string => Boolean(s) && s.startsWith('/_next/'));
  const styles = [...html.matchAll(/<link[^>]+href="(\/_next\/[^"]+\.css)"/g)].map((m) => m[1]!);

  let jsGzip = 0;
  for (const s of new Set(scripts)) {
    const p = join(outDir, s);
    if (existsSync(p)) jsGzip += gzipSync(readFileSync(p)).length;
  }
  let cssGzip = 0;
  for (const s of new Set(styles)) {
    const p = join(outDir, s);
    if (existsSync(p)) cssGzip += gzipSync(readFileSync(p)).length;
  }
  const htmlGzip = gzipSync(Buffer.from(html)).length;

  return { route, jsGzip, cssGzip, htmlGzip, totalGzip: jsGzip + cssGzip + htmlGzip };
}

const measurements = ROUTES.map(({ route, file }) => measure(route, file)).filter(
  (m): m is RouteMeasurement => m !== null,
);

if (measurements.length === 0) {
  console.error('check-bundle-budget: no built routes found. Run the web build first.');
  process.exit(1);
}

const baseline: Record<string, number> = existsSync(baselinePath)
  ? (JSON.parse(readFileSync(baselinePath, 'utf8')) as Record<string, number>)
  : {};

const kb = (n: number): string => `${(n / 1024).toFixed(1)}KB`;

const failures: string[] = [];
const overTarget: string[] = [];

console.log('Route JS (gzipped, excluding nomodule polyfills):\n');
for (const m of measurements) {
  const target = SPEC_TARGETS[m.route] ?? SPEC_TARGETS.default!;
  const base = baseline[m.route];
  const status = base === undefined ? 'new baseline' : `baseline ${kb(base)}`;
  console.log(
    `  ${m.route.padEnd(12)} JS ${kb(m.jsGzip).padStart(8)}  CSS ${kb(m.cssGzip).padStart(7)}  ` +
      `HTML ${kb(m.htmlGzip).padStart(7)}  total ${kb(m.totalGzip).padStart(8)}  (${status})`,
  );

  if (base !== undefined && m.jsGzip > base * REGRESSION_TOLERANCE) {
    failures.push(
      `${m.route}: JS grew to ${kb(m.jsGzip)} from a baseline of ${kb(base)} ` +
        `(+${(((m.jsGzip - base) / base) * 100).toFixed(1)}%). ` +
        'Find what was added, or record a new baseline deliberately.',
    );
  }
  if (m.jsGzip > target) {
    overTarget.push(`${m.route}: ${kb(m.jsGzip)} against the spec §31 target of ${kb(target)}`);
  }
  if (m.totalGzip > TOTAL_PAGE_WEIGHT_TARGET) {
    failures.push(
      `${m.route}: total page weight ${kb(m.totalGzip)} exceeds the §31 budget of ${kb(TOTAL_PAGE_WEIGHT_TARGET)}`,
    );
  }
}

if (overTarget.length > 0) {
  console.log('\nAbove the spec §31 target (tracked in docs/DECISIONS.md ADR-0005):');
  for (const o of overTarget) console.log(`  ⚠ ${o}`);
  console.log(
    '\n  The mandated stack (Next.js App Router + React 19) costs roughly 113KB gzipped\n' +
      '  before any application code. Reducing this further means changing the stack,\n' +
      '  which is a decision for a human, not a silently relaxed threshold.',
  );
}

if (process.env.SGO_WRITE_BASELINE === '1') {
  const next: Record<string, number> = {};
  for (const m of measurements) next[m.route] = m.jsGzip;
  writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`\ncheck-bundle-budget: wrote a new baseline to ${baselinePath}`);
  process.exit(0);
}

if (failures.length > 0) {
  console.error(`\ncheck-bundle-budget: ${failures.length} regression(s)\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log('\ncheck-bundle-budget: no regression against the recorded baseline.');
