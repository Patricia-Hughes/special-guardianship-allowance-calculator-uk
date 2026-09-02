/**
 * Data integrity CI gate — spec §9.
 *
 * Every one of these fails the build. A transcription error in a rate table is
 * the highest-impact defect this product can ship: it is legally wrong
 * information handed to someone in financial crisis, and it looks authoritative.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const schemaDir = join(dataDir, 'schema');

const failures: string[] = [];
const notes: string[] = [];

const fail = (check: string, msg: string): void => {
  failures.push(`[${check}] ${msg}`);
};
const note = (msg: string): void => {
  notes.push(msg);
};

const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const compiled = new Map<string, ValidateFunction>();
function compile(name: string): ValidateFunction {
  let v = compiled.get(name);
  if (!v) {
    v = ajv.compile(readJson(join(schemaDir, name)));
    compiled.set(name, v);
  }
  return v;
}

const dataFiles = readdirSync(dataDir).filter((f) => f.endsWith('.json'));

// ── 1. JSON Schema validation of every file in /data against /data/schema ──
const schemaFor = (file: string): string | null => {
  if (file.startsWith('rates.')) return 'rates.schema.json';
  if (file.startsWith('benefits.')) return 'benefits.schema.json';
  if (file === 'la-overrides.json') return 'la-overrides.schema.json';
  if (file === 'la-region-map.json') return 'la-region-map.schema.json';
  if (file === 'kinship-zones.json') return 'kinship-zones.schema.json';
  if (file === 'citations.json') return 'citations.schema.json';
  if (file === 'watchlist.json') return 'watchlist.schema.json';
  return null;
};

for (const file of dataFiles) {
  const schemaName = schemaFor(file);
  if (!schemaName) {
    fail('1 schema', `${file} has no schema in /data/schema — every data file must have one`);
    continue;
  }
  const validate = compile(schemaName);
  const doc = readJson(join(dataDir, file));
  if (!validate(doc)) {
    for (const err of validate.errors ?? []) {
      fail('1 schema', `${file}${err.instancePath} ${err.message ?? ''}`);
    }
  }
}

// ── Load the files the later checks need ───────────────────────────────────
interface AgeBand {
  id: string;
  minAge: number;
  maxAge: number;
}
interface AnomalySource {
  source?: string;
  url?: string;
  date?: string;
  finding?: string;
}
interface RateSection {
  ageBands: AgeBand[];
  regions?: Record<string, Record<string, number>>;
  rates?: Record<string, number>;
  sourceId?: string;
  verify?: boolean;
  verifyNote?: string;
  anomalyConfirmed?: boolean;
  anomalyCorroboration?: AnomalySource[];
  userFacingNote?: string;
}
interface RateDoc {
  financialYear: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: string;
  pendingSourceIssue?: string;
  [k: string]: unknown;
}

const rateFiles = dataFiles.filter((f) => f.startsWith('rates.'));
const rateDocs = new Map<string, RateDoc>();
for (const f of rateFiles) rateDocs.set(f, readJson(join(dataDir, f)) as unknown as RateDoc);

const NATIONS = ['england', 'wales', 'northern-ireland', 'scotland'] as const;

/** Every (nation, region) rate set in a document, flattened for checking. */
interface RateSet {
  label: string;
  nation: string;
  bands: AgeBand[];
  rates: Record<string, number>;
  /** Marked in the data as known-suspect and awaiting confirmation. */
  unverified: boolean;
  /** Suspect-looking, but corroborated as genuinely published. */
  anomalyConfirmed: boolean;
}

function rateSets(doc: RateDoc): RateSet[] {
  const out: RateSet[] = [];
  for (const nation of NATIONS) {
    const section = doc[nation] as RateSection | null | undefined;
    if (!section) continue;
    const unverified = section.verify === true;
    const anomalyConfirmed = section.anomalyConfirmed === true;
    if (section.regions) {
      for (const [region, rates] of Object.entries(section.regions)) {
        out.push({ label: `${nation}/${region}`, nation, bands: section.ageBands, rates, unverified, anomalyConfirmed });
      }
    } else if (section.rates) {
      out.push({ label: nation, nation, bands: section.ageBands, rates: section.rates, unverified, anomalyConfirmed });
    }
  }
  return out;
}

/**
 * A nation whose rates are marked `verify: true` may ship — the spec keeps the
 * figures rather than inventing corrected ones — but its route must be behind a
 * feature flag that is OFF. Holding suspect data is allowed; serving it is not.
 */
const ROUTE_FLAG_FOR_NATION: Record<string, string> = {
  wales: 'WALES_ROUTE_ENABLED',
};

const MIN_WEEKLY_PENCE = 5000; // £50/wk
const MAX_WEEKLY_PENCE = 60000; // £600/wk

for (const [file, doc] of rateDocs) {
  if (doc.status === 'PENDING_SOURCE') continue;
  for (const set of rateSets(doc)) {
    const ordered = [...set.bands].sort((a, b) => a.minAge - b.minAge);

    // ── 2. Rates must increase monotonically by age band ───────────────────
    let previous = -1;
    let previousBand = '';
    for (const band of ordered) {
      const value = set.rates[band.id];
      if (value === undefined) {
        fail('2 monotonic', `${file} ${set.label} has no rate for band ${band.id}`);
        continue;
      }
      if (value < previous) {
        const message =
          `${file} ${set.label}: band ${band.id} (${value}p) is lower than ${previousBand} (${previous}p). ` +
          'Rates must not fall as age rises — this is usually a transcription error.';
        if (set.anomalyConfirmed) {
          // Established as genuinely published. This no longer requires
          // verify: true, because verify means "we doubt this figure" and a
          // primary source removes the doubt without removing the oddity.
          // Wales is the case: the Welsh Government's own circular prints the
          // younger band higher, so the data is confirmed and not suspect.
          // Check 12 still insists on the corroboration and the on-screen line.
          note(`${message} Corroborated as genuinely published, and served with an explanation.`);
        } else if (set.unverified) {
          note(`${message} Marked verify: true, so the route must stay disabled.`);
        } else {
          fail('2 monotonic', message);
        }
      }
      previous = value;
      previousBand = band.id;

      // ── 3. Typo detection: no rate below £50/wk or above £600/wk ─────────
      if (value < MIN_WEEKLY_PENCE || value > MAX_WEEKLY_PENCE) {
        fail(
          '3 sanity',
          `${file} ${set.label} ${band.id} = ${value}p, outside £50–£600/wk. Pounds entered as pence?`,
        );
      }
    }

    // ── Age bands must be contiguous and cover 0–17 ────────────────────────
    let expected = 0;
    for (const band of ordered) {
      if (band.minAge !== expected) {
        fail('2 monotonic', `${file} ${set.label}: age band ${band.id} starts at ${band.minAge}, expected ${expected}`);
      }
      if (band.maxAge < band.minAge) {
        fail('2 monotonic', `${file} ${set.label}: age band ${band.id} ends before it starts`);
      }
      expected = band.maxAge + 1;
    }
    if (expected !== 18) {
      fail('2 monotonic', `${file} ${set.label}: age bands cover 0–${expected - 1}, not 0–17`);
    }
  }
}

// ── 12. A `verify: true` nation must have its route flag OFF ──────────────
const featureFlagsSource = readFileSync(
  join(root, 'packages', 'engine', 'src', 'featureFlags.ts'),
  'utf8',
);
for (const [, doc] of rateDocs) {
  if (doc.status === 'PENDING_SOURCE') continue;
  for (const nation of NATIONS) {
    const section = doc[nation] as RateSection | null | undefined;
    if (!section) continue;
    // Either state brings a section in here. verify: true means we doubt the
    // figure. anomalyConfirmed means we have established an odd-looking one is
    // genuinely published. A section can now be the second without the first,
    // once a primary source lands, and it must not escape the requirements
    // below by dropping verify.
    if (section.verify !== true && section.anomalyConfirmed !== true) continue;
    if (section.verify === true && !section.verifyNote) {
      fail('12 verify', `${nation} rates are marked verify: true with no verifyNote saying what to check`);
    }
    const flagName = ROUTE_FLAG_FOR_NATION[nation];
    if (!flagName) {
      if (section.verify === true) {
        fail('12 verify', `${nation} rates are marked verify: true but no route flag is defined for that nation`);
        continue;
      }
      // Confirmed but not doubted, and no route flag exists for this nation.
      // Nothing to gate; the corroboration rules below still apply.
    }
    const enabled = flagName ? new RegExp(`${flagName}:\\s*true`).test(featureFlagsSource) : true;

    // An odd-looking figure has two quite different states, and conflating them
    // either strands a whole nation or ships a number nobody has checked.
    //
    //   verify: true alone            — suspect. Hold the data, do not serve it.
    //   + anomalyConfirmed: true      — independently corroborated. May be
    //                                   served, because the alternative is
    //                                   telling every carer in that nation
    //                                   nothing at all. Still not a primary
    //                                   source, so verify stays true and the
    //                                   hunt for the original continues.
    //
    // Confirming an anomaly is deliberately expensive: two independent
    // corroborating sources, and a plain-English line shown to the user, since
    // a figure that looks wrong reads as a bug in the site unless we say
    // otherwise.
    if (section.anomalyConfirmed === true) {
      const sources = section.anomalyCorroboration ?? [];
      if (sources.length < 2) {
        fail(
          '12 verify',
          `${nation} rates are marked anomalyConfirmed: true with ${sources.length} corroborating source(s). ` +
            'Confirming an anomaly takes at least two independent sources.',
        );
      }
      for (const s of sources) {
        if (!s.url || !s.finding) {
          fail('12 verify', `${nation} anomalyCorroboration entry "${s.source ?? '?'}" needs both a url and a finding`);
        }
      }
      if (!section.userFacingNote) {
        fail(
          '12 verify',
          `${nation} rates are marked anomalyConfirmed: true with no userFacingNote. ` +
            'A rate that looks wrong must be explained on screen, or carers will read it as a bug.',
        );
      }
      note(
        `${nation} rates carry a confirmed anomaly, corroborated by ${sources.length} sources` +
          `${flagName ? `; ${flagName} may be on` : ''}. ` +
          (section.verify === true
            ? 'Primary source still outstanding.'
            : 'Confirmed against a primary source.'),
      );
    } else if (enabled) {
      fail(
        '12 verify',
        `${nation} rates are marked verify: true but ${flagName} is true. ` +
          'Unverified rates must not be served — confirm them against the original source first, ' +
          'or corroborate the anomaly and set anomalyConfirmed.',
      );
    } else {
      note(`${nation} rates are unverified; ${flagName} is off, so the route is not served.`);
    }
  }
}

// ── 4. Uplift sanity: each year within 0–15% of the prior year ─────────────
const sortedYears = [...rateDocs.entries()]
  .filter(([, d]) => d.status !== 'PENDING_SOURCE')
  .sort((a, b) => a[1].financialYear.localeCompare(b[1].financialYear));

for (let i = 1; i < sortedYears.length; i++) {
  const [prevFile, prevDoc] = sortedYears[i - 1]!;
  const [file, doc] = sortedYears[i]!;
  const prevSets = new Map(rateSets(prevDoc).map((s) => [s.label, s]));
  for (const set of rateSets(doc)) {
    const prior = prevSets.get(set.label);
    if (!prior) continue;
    for (const band of set.bands) {
      const now = set.rates[band.id];
      const before = prior.rates[band.id];
      if (now === undefined || before === undefined || before === 0) continue;
      const uplift = ((now - before) / before) * 100;
      if (uplift < 0 || uplift > 15) {
        fail(
          '4 uplift',
          `${file} ${set.label} ${band.id}: ${uplift.toFixed(2)}% change from ${prevFile}. ` +
            'Expected 0–15%. Verify against the source document before merging.',
        );
      }
    }
  }
}

// ── Contiguity of financial years ──────────────────────────────────────────
const byYear = [...rateDocs.values()].sort((a, b) => a.financialYear.localeCompare(b.financialYear));
for (let i = 1; i < byYear.length; i++) {
  const prev = byYear[i - 1]!;
  const cur = byYear[i]!;
  if (!prev.effectiveTo || !cur.effectiveFrom) continue;
  const dayAfter = new Date(`${prev.effectiveTo}T00:00:00Z`);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
  if (dayAfter.toISOString().slice(0, 10) !== cur.effectiveFrom) {
    fail(
      '4 uplift',
      `Rate tables are not contiguous: ${prev.financialYear} ends ${prev.effectiveTo}, ` +
        `${cur.financialYear} starts ${cur.effectiveFrom}. A gap means a date with no rates.`,
    );
  }
}

// ── 5/6. Region map coverage ───────────────────────────────────────────────
const regionMapDoc = readJson(join(dataDir, 'la-region-map.json'));
const regionMap = regionMapDoc.map as Record<string, string>;
const regionNames = regionMapDoc.names as Record<string, string>;
const expectedCount = regionMapDoc.expectedAuthorityCount as number;

const overridesDoc = readJson(join(dataDir, 'la-overrides.json'));
interface LaEntry {
  slug: string;
  name: string;
  publishable: boolean;
  corePolicy?: string;
  policySourceUrl: string;
  pendingSourceIssue?: string;
  verifiedOn: string;
  lawfulnessFlag?: { sourceUrl: string; decisionDate: string } | null;
  fixedPercentageOfFosteringRate?: number | null;
  livingCostsMultiplierPercent?: number;
  region?: string;
  [k: string]: unknown;
}
const authorities = overridesDoc.authorities as LaEntry[];

for (const la of authorities) {
  if (!(la.slug in regionMap)) {
    fail('5 coverage', `la-overrides has "${la.slug}" but la-region-map does not`);
  } else if (la.region && regionMap[la.slug] !== la.region) {
    fail(
      '5 coverage',
      `la-overrides says ${la.slug} is in ${la.region}; la-region-map says ${regionMap[la.slug]}`,
    );
  }
}

if (Object.keys(regionMap).length < 152) {
  fail(
    '6 coverage',
    `la-region-map covers ${Object.keys(regionMap).length} authorities, fewer than the 152 English ` +
      'children\'s services authorities required before launch (spec §42 item 8)',
  );
}
if (Object.keys(regionMap).length !== expectedCount) {
  fail(
    '6 coverage',
    `la-region-map has ${Object.keys(regionMap).length} entries but declares expectedAuthorityCount ` +
      `${expectedCount}. Update the declared count deliberately, so a silent drop is caught.`,
  );
}
for (const slug of Object.keys(regionMap)) {
  if (!regionNames[slug]) fail('6 coverage', `la-region-map has no display name for "${slug}"`);
}

// Kinship Zone councils must be mapped, or the region lookup fails for them.
const zonesDoc = readJson(join(dataDir, 'kinship-zones.json'));
for (const slug of zonesDoc.localAuthorities as string[]) {
  if (!(slug in regionMap)) {
    fail('6 coverage', `Kinship Zone council "${slug}" is not in la-region-map`);
  }
}

// ── 7. Every citation id referenced in code or content exists ──────────────
const citations = readJson(join(dataDir, 'citations.json'));
const citationIds = new Set(Object.keys(citations));

function walk(dir: string, exts: string[], acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
    if (entry.name === '.git' || entry.name === '.turbo' || entry.name === 'out') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, acc);
    else if (exts.some((e) => entry.name.endsWith(e))) acc.push(full);
  }
  return acc;
}

const sourceFiles = [
  ...walk(join(root, 'packages'), ['.ts', '.tsx']),
  ...walk(join(root, 'apps'), ['.ts', '.tsx', '.mdx']),
].filter((f) => !f.includes('/data/') && !f.includes('__tests__'));

const CITE_CALL = /\bcite\(\s*['"]([a-z0-9-]+)['"]\s*\)/g;
const CITE_TAG = /<Cite\s+id=["']([a-z0-9-]+)["']/g;
const CITATIONS_FRONTMATTER = /^citations:\s*\[([^\]]*)\]/gm;

for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(root.length + 1);
  for (const re of [CITE_CALL, CITE_TAG]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const id = m[1]!;
      if (!citationIds.has(id)) {
        fail('7 citations', `${rel} references citation "${id}", which is not in citations.json`);
      }
    }
  }
  CITATIONS_FRONTMATTER.lastIndex = 0;
  let fm: RegExpExecArray | null;
  while ((fm = CITATIONS_FRONTMATTER.exec(text)) !== null) {
    for (const raw of fm[1]!.split(',')) {
      const id = raw.trim().replace(/^["']|["']$/g, '');
      if (id && !citationIds.has(id)) {
        fail('7 citations', `${rel} frontmatter references citation "${id}", not in citations.json`);
      }
    }
  }
}

// Every sourceId in a rate/benefit file must be a real citation.
for (const [file, doc] of rateDocs) {
  for (const nation of NATIONS) {
    const section = doc[nation] as RateSection | null | undefined;
    if (section?.sourceId && !citationIds.has(section.sourceId)) {
      fail('7 citations', `${file} ${nation}.sourceId "${section.sourceId}" is not in citations.json`);
    }
  }
}

// ── 8/9. [R9] Naming a council requires a stored, dated, live source ───────
for (const la of authorities) {
  const makesAPolicyClaim = Boolean(la.corePolicy) || la.flatCoreRateWeeklyPence !== undefined;
  if (la.publishable) {
    if (makesAPolicyClaim && !la.policySourceUrl) {
      fail(
        '8 R9',
        `la-overrides "${la.slug}" is publishable and makes a policy claim but has no policySourceUrl. ` +
          'Naming a council publicly requires a current citable source.',
      );
    }
    if (la.lawfulnessFlag) {
      if (!la.lawfulnessFlag.sourceUrl) {
        fail('9 R9', `la-overrides "${la.slug}" lawfulnessFlag has no sourceUrl`);
      }
      if (!la.lawfulnessFlag.decisionDate) {
        fail('9 R9', `la-overrides "${la.slug}" lawfulnessFlag has no decisionDate`);
      }
    }
  } else {
    // Not publishable: the engine must be ignoring it. Require the reason to be
    // tracked, so an entry cannot sit unsourced and forgotten.
    if (!la.pendingSourceIssue) {
      fail(
        '10 pending',
        `la-overrides "${la.slug}" is publishable: false with no pendingSourceIssue link`,
      );
    }
    note(`la-overrides "${la.slug}" is held back from publication pending its source URL`);
  }
}

// ── 10. Every PENDING_SOURCE marker has an open issue link ─────────────────
function findPending(value: unknown, path: string, file: string): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => findPending(v, `${path}[${i}]`, file));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const obj = value as Record<string, unknown>;
  if (obj.status === 'PENDING_SOURCE') {
    if (typeof obj.pendingSourceIssue !== 'string' || obj.pendingSourceIssue.length === 0) {
      fail('10 pending', `${file}${path} is PENDING_SOURCE with no pendingSourceIssue link`);
    } else {
      note(`${file}${path || ''} is PENDING_SOURCE — tracked at ${String(obj.pendingSourceIssue)}`);
    }
  }
  for (const [k, v] of Object.entries(obj)) findPending(v, `${path}.${k}`, file);
}

for (const file of dataFiles) {
  findPending(readJson(join(dataDir, file)), '', file);
}

// ── 11. No float money anywhere: every *Pence field is an integer ──────────
function checkIntegers(value: unknown, path: string, file: string): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => checkIntegers(v, `${path}[${i}]`, file));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const p = `${path}.${k}`;
    if (/Pence$/.test(k) && v !== null) {
      if (typeof v !== 'number' || !Number.isInteger(v)) {
        fail('11 pence', `${file}${p} = ${JSON.stringify(v)} is not an integer number of pence`);
      }
    }
    checkIntegers(v, p, file);
  }
}

for (const file of dataFiles) {
  checkIntegers(readJson(join(dataDir, file)), '', file);
}

// Rate values themselves are pence but not named *Pence — check them too.
for (const [file, doc] of rateDocs) {
  for (const set of rateSets(doc)) {
    for (const [band, value] of Object.entries(set.rates)) {
      if (!Number.isInteger(value)) {
        fail('11 pence', `${file} ${set.label} ${band} = ${value} is not an integer number of pence`);
      }
    }
  }
}

// ── 13. Every sourceId in the data resolves to a citation ─────────────────
// Gate 7 checks the ids that code and content cite. Nothing checked the ids the
// DATA points at, so a rate table could name a source that did not exist and
// nothing would notice — the figure would look sourced and be unattributable.
function checkSourceIds(value: unknown, path: string, file: string): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => checkSourceIds(v, `${path}[${i}]`, file));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const p = `${path}.${k}`;
    if (k === 'sourceId' && typeof v === 'string' && !citationIds.has(v)) {
      fail('13 sourceId', `${file}${p} names source "${v}", which is not in citations.json`);
    }
    checkSourceIds(v, p, file);
  }
}

for (const file of dataFiles) {
  if (file === 'citations.json') continue;
  checkSourceIds(readJson(join(dataDir, file)), '', file);
}

// ── 14. A sourced lawfulness finding must not sit in the pending slot ──────
// pendingLawfulnessFlag exists so that an unsourced allegation against a named
// council cannot be served while the rest of that council's entry publishes.
// Once someone finds the decision, it has to be promoted — otherwise the
// holding pen quietly becomes where findings go to be forgotten.
for (const la of authorities) {
  const pending = la.pendingLawfulnessFlag as
    | { sourceUrl?: string; decisionDate?: string }
    | undefined;
  if (!pending) continue;
  if (pending.sourceUrl && pending.decisionDate) {
    fail(
      '14 lawfulness',
      `la-overrides "${la.slug}" has a pendingLawfulnessFlag that is now fully sourced. ` +
        'Promote it to lawfulnessFlag so it is actually served, or drop it.',
    );
  } else {
    note(`la-overrides "${la.slug}" holds an unsourced lawfulness finding back from publication`);
  }
}

// ── 15. The fixed-percentage accusation is recorded, never inferred ────────
//
// FIXED_PERCENTAGE_POLICY is a critical flag telling a carer their council may
// be running a policy the courts struck down. It reads one recorded field, and
// never the prose in corePolicy, which describes what a council does and says
// nothing reliable about proportions: "Percentage model abolished 2018" and
// "100% of core fostering allowance" both contain a proportion and neither
// describes a council doing this.
//
// This gate makes sure the field is answered wherever the prose invites the
// question. null is a valid answer and means somebody looked.
const PROPORTION_IN_PROSE = /\b(\d{1,3}\s?%|two[- ]thirds|one[- ]third|percentage|proportion)\b/i;
for (const la of authorities) {
  const recorded = la.fixedPercentageOfFosteringRate;
  const mentioned = PROPORTION_IN_PROSE.test(la.corePolicy ?? '');
  if (mentioned && recorded === undefined) {
    fail(
      '15 fixed-percentage',
      `la-overrides "${la.slug}" describes a proportion in corePolicy but does not record ` +
        'fixedPercentageOfFosteringRate. Set it to the fraction, or to null if the council pays no ' +
        'fixed fraction. It must never be guessed from the wording.',
    );
  }
  if (recorded !== undefined && recorded !== null) {
    if (typeof recorded !== 'number' || !Number.isFinite(recorded) || recorded <= 0) {
      fail(
        '15 fixed-percentage',
        `la-overrides "${la.slug}" fixedPercentageOfFosteringRate is ${String(recorded)}, which is not ` +
          'a usable fraction.',
      );
    } else if (recorded < 1 && !la.publishable) {
      note(`la-overrides "${la.slug}" records a fixed fraction but is not published`);
    }
  }
}

// ── 16. A living-costs figure that departs from the model is sourced ───────
for (const la of authorities) {
  const pct = la.livingCostsMultiplierPercent;
  if (pct === undefined) continue;
  if (typeof pct !== 'number' || !Number.isFinite(pct) || pct <= 0) {
    fail('16 living-costs', `la-overrides "${la.slug}" livingCostsMultiplierPercent is not a percentage`);
  } else if (pct !== 125 && !la.policySourceUrl) {
    fail(
      '16 living-costs',
      `la-overrides "${la.slug}" departs from the model's 125% living-costs figure with no ` +
        'policySourceUrl. This changes every means-tested result for that council.',
    );
  }
}

// ── 17. A superseded finding carries its own source ────────────────────────
for (const la of authorities) {
  const lf = la.lawfulnessFlag as
    | { supersededBy?: { sourceUrl?: string; summary?: string }; concernsFormerPolicy?: boolean }
    | null
    | undefined;
  if (!lf?.supersededBy) continue;
  if (!lf.supersededBy.sourceUrl || !lf.supersededBy.summary) {
    fail(
      '17 lawfulness',
      `la-overrides "${la.slug}" says a finding was superseded but gives no sourceUrl and summary for ` +
        'the later decision. Saying a council has been cleared needs the same evidence as saying it ' +
        'was at fault.',
    );
  }
}

// ── 18. Every warning and letter that makes a claim carries a source ───────
//
// A warning shown on a result is a claim to a carer, so it needs a source for
// the same reason a guidance page does. Covering the pages and the data and
// stopping there is how an unsourced legal assertion reaches a result page
// without anything objecting.
//
// The exceptions are listed by name rather than inferred, so adding one is a
// decision somebody makes on purpose.
const WARNINGS_WITHOUT_A_SOURCE = new Map<string, string>([
  ['LGSCO_FINDING_AGAINST_LA', 'its source is the specific decision, passed in per council'],
  ['LGSCO_FINDING_FORMER_POLICY', 'same, the decision is per council'],
  ['LA_POLICY_UNDER_REVIEW', "it reports the council's own words about its own policy"],
  ['RATES_STALE', 'it describes the state of this site, not the law'],
]);

const flagsSource = readFileSync(join(root, 'packages', 'engine', 'src', 'flags.ts'), 'utf8');
const catalogueBody = flagsSource.slice(flagsSource.indexOf('FLAG_CATALOGUE'));
for (const m of catalogueBody.matchAll(/^ {2}([A-Z][A-Z_0-9]+): \{(.*?)^ {2}\},/gms)) {
  const [, code, body] = m as unknown as [string, string, string];
  const hasCitation = /citationId:/.test(body);
  const exempt = WARNINGS_WITHOUT_A_SOURCE.has(code);
  if (!hasCitation && !exempt) {
    fail(
      '18 warning sources',
      `flags.ts "${code}" makes a claim to a carer with no citationId. Give it one, or add it to ` +
        'WARNINGS_WITHOUT_A_SOURCE in this script with the reason it does not need one.',
    );
  }
  if (hasCitation && exempt) {
    fail(
      '18 warning sources',
      `flags.ts "${code}" now has a citationId but is still listed as not needing one. Remove it ` +
        'from WARNINGS_WITHOUT_A_SOURCE.',
    );
  }
}

const lettersSource = readFileSync(join(root, 'packages', 'letters', 'src', 'index.ts'), 'utf8');
for (const m of lettersSource.matchAll(/^ {2}'([a-z0-9-]+)': \{(.*?)^ {2}\},/gms)) {
  const [, template, body] = m as unknown as [string, string, string];
  const ids = /citationIds:\s*\[([^\]]*)\]/.exec(body);
  if (!ids || ids[1]!.trim() === '') {
    fail('18 warning sources', `letters "${template}" cites nothing. Every letter states a position.`);
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
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

console.log(`validate-data: all checks passed across ${dataFiles.length} data files.`);
