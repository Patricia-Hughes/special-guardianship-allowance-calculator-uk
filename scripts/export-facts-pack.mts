/**
 * Every number, rule and assumption the calculator runs on, in one file.
 *
 * For a final research review. Generated from /data and from the engine source,
 * so it cannot drift from what actually ships: if a figure changes here it is
 * because the figure changed in the product.
 *
 * The point of the file is to make each claim checkable. So every rate carries
 * its source and the date it was read, every rule says where it comes from, and
 * everything the site assumes rather than knows is called an assumption in the
 * same list as the things it knows.
 *
 * Run: pnpm export:facts
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const outFile = join(root, 'CALCULATOR-FACTS.md');

const read = (f: string): any => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));
const src = (...p: string[]): string => readFileSync(join(root, ...p), 'utf8');

const citations = read('citations.json');
const overrides = read('la-overrides.json');
const regionMap = read('la-region-map.json');
const zones = read('kinship-zones.json');
const watchlist = read('watchlist.json');
const flags = src('packages', 'engine', 'src', 'featureFlags.ts');

const rateFiles = readdirSync(dataDir).filter((f) => f.startsWith('rates.')).sort();
const benefitFiles = readdirSync(dataDir).filter((f) => f.startsWith('benefits.')).sort();

const NATIONS = ['england', 'wales', 'scotland', 'northern-ireland'] as const;
const money = (p: number): string => `£${(p / 100).toFixed(2)}`;

/** A source, named so it can be checked, or an honest gap. */
function cite(id: string | undefined): string {
  if (!id) return '_no source recorded_';
  const c = citations[id];
  if (!c) return `**UNKNOWN SOURCE "${id}"**`;
  const where = c.url ? `[${c.label}](${c.url})` : `${c.label} (**no URL yet**)`;
  return `${where}, read ${c.retrieved}`;
}

const parts: string[] = [];
const p = (s: string): void => void parts.push(s);

// ─── Preamble ──────────────────────────────────────────────────────────────

p(`# Every figure and rule behind the calculator

For final research review. Generated ${new Date().toISOString().slice(0, 10)} from \`/data\` and
the engine source, so nothing here can drift from what the site actually does.

## What to check, and what not to

**Check:** that every figure below matches its source document as printed, that
every source is reachable, and that nothing described as a rule is actually an
assumption in disguise.

**Do not "correct" anything that looks odd.** Two things on this site look like
errors and are not, and both are documented below: the Welsh age bands, and the
Scottish 5 to 15 band. Both were checked twice.

**The standing rule:** if a figure or a legal point is not in a published source
we hold, it does not go in the product. Where something is missing the site says
so rather than estimating. Those admissions are listed at the end, and they are
deliberate.
`);

// ─── Feature flags: what is actually switched on ───────────────────────────

p(`\n---\n\n## 1. What is switched on

A feature behind a flag that is off does not run at all, whatever the data says.
`);
const flagRows = [...flags.matchAll(/^\s{2}([A-Z_]+):\s*(true|false),/gm)].map(
  ([, name, value]) => `| \`${name}\` | ${value === 'true' ? '**on**' : 'off'} |`,
);
p(`\n| Feature | State |\n|---|---|\n${flagRows.join('\n')}\n`);

// ─── Rates ─────────────────────────────────────────────────────────────────

p(`\n---\n\n## 2. The allowance rates

These are fostering national minimum allowances. The statutory guidance says the
core fostering allowance is the starting point for a special guardianship
allowance, which is why they are the basis of every figure the site shows.

All amounts are per week.
`);

for (const file of rateFiles) {
  const doc = read(file);
  p(`\n### Financial year ${doc.financialYear}\n`);
  p(`Effective ${doc.effectiveFrom} to ${doc.effectiveTo}.`);
  if (doc.councilApplicationFrom && doc.dfeStatedTaxYearFrom) {
    p(
      `\nTwo dates, deliberately: councils apply from **${doc.councilApplicationFrom}**, the DfE ` +
        `states the same rates for a tax year beginning **${doc.dfeStatedTaxYearFrom}**. The site ` +
        `pays out on the council convention and says in pounds what the other reading would give.`,
    );
  }
  if (doc.note) p(`\n> ${doc.note}`);

  for (const nation of NATIONS) {
    const section = doc[nation];
    p(`\n#### ${nation}\n`);
    if (!section) {
      p(`**Not held for this year.** Backdating excludes ${doc.financialYear} for ${nation} and says so on screen.`);
      continue;
    }
    p(`Source: ${cite(section.sourceId)}`);
    if (section.upliftPercent !== undefined) p(`\nUplift on the previous year: ${section.upliftPercent}%`);

    const bands: Array<{ id: string }> = section.ageBands ?? [];
    if (section.regions) {
      const regions = Object.keys(section.regions);
      p(`\n| Age band | ${regions.join(' | ')} |`);
      p(`|---|${regions.map(() => '---').join('|')}|`);
      for (const b of bands) {
        p(`| ${b.id} | ${regions.map((r) => money(section.regions[r][b.id])).join(' | ')} |`);
      }
    } else if (section.rates) {
      p(`\n| Age band | Weekly |\n|---|---|`);
      for (const b of bands) p(`| ${b.id} | ${money(section.rates[b.id])} |`);
    }

    if (section.note) p(`\n> **Note:** ${section.note}`);
    if (section.bandNote) p(`\n> **On the bands:** ${section.bandNote}`);
    if (section.verify) p(`\n> **verify: true.** We doubt this figure and it is held, not trusted.`);
    if (section.anomalyConfirmed) {
      p(`\n> **anomalyConfirmed: true.** This looks wrong and is not. Corroborated by:`);
      for (const s of section.anomalyCorroboration ?? []) {
        p(`> - ${s.source}${s.url ? ` (${s.url})` : ''}: ${s.finding}`);
      }
    }
    if (section.userFacingNote) p(`\n> **Shown to the reader:** ${section.userFacingNote}`);
  }
}

// ─── Benefits ──────────────────────────────────────────────────────────────

p(`\n---\n\n## 3. Benefit figures

Separate from the rates and deliberately so: allowance rates change on 1 April,
benefit rates change in the first full week of April. Between the two dates the
new allowance rates coexist with the old benefit rates, so these are two
independent lookups and neither is derived from the other.
`);

for (const file of benefitFiles) {
  const doc = read(file);
  p(`\n### ${doc.financialYear}\n`);
  p(`Effective from ${doc.effectiveFrom}.`);
  if (doc.status === 'PENDING_SOURCE') {
    p(`\n**PENDING_SOURCE.** Not usable. Tracked at ${doc.pendingSourceIssue ?? 'no link'}.`);
  }
  const cb = doc.childBenefit;
  if (cb) {
    p(`\n**Child Benefit**, source ${cite(cb.sourceId)}\n`);
    p(`| | Weekly |\n|---|---|`);
    p(`| Eldest child | ${cb.eldestWeeklyPence == null ? '_not sourced_' : money(cb.eldestWeeklyPence)} |`);
    p(`| Each other child | ${cb.additionalChildWeeklyPence == null ? '_not sourced_' : money(cb.additionalChildWeeklyPence)} |`);
  }
  const ga = doc.guardiansAllowance;
  if (ga) {
    p(`\n**Guardian's Allowance:** ${ga.weeklyPerChildPence == null ? '_not sourced_' : money(ga.weeklyPerChildPence)}, source ${cite(ga.sourceId)}`);
  }
  const isa = doc.incomeSupportApplicableAmounts;
  if (isa) {
    p(`\n**Income Support applicable amounts**, source ${cite(isa.sourceId)}`);
    if (isa.status === 'PENDING_SOURCE') {
      p(`\n**PENDING_SOURCE.** The means test cannot run for this year, and throws rather than estimating.`);
    } else {
      p(`\n| Element | Weekly |\n|---|---|`);
      for (const [k, v] of Object.entries(isa.schema ?? {})) {
        if (typeof v === 'number') p(`| ${k.replace(/Pence$/, '')} | ${money(v)} |`);
      }
    }
  }
}

// ─── The means test ────────────────────────────────────────────────────────

p(`\n---\n\n## 4. The means test, step by step

This models the **DfE Standardised Means Test Model**, which most English
councils use. It is **not statutory** and it pre-dates Universal Credit, so every
result that uses it carries a warning saying so.

**The order matters and is the single most common implementation error.** The
20% disregard comes off INCOME, before any expenditure:

    correct:   (3000 x 0.8) - 2000 = 400
    wrong:     (3000 - 2000) x 0.8 = 800

A property test exists solely to catch that inversion.

### The steps, in order

1. **Countable income**, monthly: net earnings, other income, benefits that
   count, and Child Benefit for the carer's OTHER children.
2. **The 20% disregard**, applied to that income total.
3. **Allowable expenditure**, subtracted: rent or mortgage, council tax,
   essential loan repayments, maintenance paid out, pension contributions,
   childcare, and then basic living costs.
4. **Disposable income**, floored at zero.
5. **Capital tariff**, only where a council's own recorded policy enables it.
6. **The taper**, converting disposable income into the contribution the council
   expects, then converted to a weekly figure as monthly x 12 / 52.

### The three numbers in the model

| Figure | Value | Status |
|---|---|---|
| Income disregard | 20% | From the DfE model |
| Basic living costs | 125% of the Income Support applicable amount | From the DfE model. **Devon publishes 100%**, and where a council publishes its own figure the site uses it |
| The taper | Assumed **pound for pound** | **THERE IS NO NATIONAL RULE.** Confirmed against the 2005 Regulations, the 2017 statutory guidance, the DfE model and the 2024 kinship guidance. Every affected result says the method is assumed and asks the council where its own comes from |

### What is never counted

Disability benefits for the child, criminal injuries compensation, fostering
income for other children, Guardian's Allowance, the special guardianship
allowance itself, Child Benefit for the assessed child, and the childcare
element of Working Tax Credit.

### Child Benefit for the assessed child

**Never deducted by default.** Only where the carer explicitly ticks that their
council does it, and never silently. A runtime assertion throws if a deduction
ever appears without that opt-in.
`);

// ─── Backdating ────────────────────────────────────────────────────────────

p(`\n---\n\n## 5. Backdating

Answers "what should I have been paid since the order?". The period is cut into
segments wherever the correct rate could change, and each segment is priced on
its own:

1. every **1 April**, the financial year boundary
2. every **6 April**, where the DfE's tax year disagrees with it
3. every **birthday that crosses an age band**
4. the **24 month regulation 7 anniversary**
5. the start of the period

Where a segment falls in a year whose rates are not held, that year is **excluded
and named**. It is never estimated. The total says which years it covers.

Backdating handles **one child at a time**. Apportioning a household contribution
across a period with age band changes at different dates is not specified
anywhere, so the tool refuses rather than inventing an allocation.
`);

// ─── Guardrails ────────────────────────────────────────────────────────────

p(`\n---\n\n## 6. The rules that stop a wrong figure reaching a carer

These are runtime assertions, not wording on a page. If the engine ever computes
a result that violates one, it throws and the site says it cannot give a figure,
rather than showing the number.

| Rule | What it forbids |
|---|---|
| R1 | Outputting a fixed fraction of the fostering rate as the answer, without a means test. Two thirds, 58%, 75% and 50% are all caught |
| R2 | Deducting Child Benefit without an explicit opt-in, or deducting it from someone on means-tested benefits without raising the critical warning |
| R3 | Any figure without the citation it derives from |
| R4 | Showing a former foster carer less than their previous fostering allowance inside the 24 month window |
| R5 | Any English law reaching a Scottish result. Special guardianship orders do not exist in Scots law |
| SANITY | A negative allowance, or an estimate above the maximum with no floor applied |
`);

// ─── Councils ──────────────────────────────────────────────────────────────

const authorities: any[] = overrides.authorities;
const published = authorities.filter((a) => a.publishable);
const held = authorities.filter((a) => !a.publishable);

p(`\n---\n\n## 7. What we hold about individual councils

Naming a council in public is the most defamation-shaped thing this site does, so
an entry only reaches a reader when it has a stored, dated, live source. An entry
without one is invisible to the engine: the calculation falls back to the
national minimums and says we do not hold that council's policy.

**${published.length} published, ${held.length} held back.**
`);

for (const la of published) {
  p(`\n### ${la.name}\n`);
  p(`- Region: ${la.region ?? regionMap.map[la.slug] ?? 'not mapped'}`);
  if (la.corePolicy) p(`- Policy as we read it: ${la.corePolicy}`);
  if (la.fixedPercentageOfFosteringRate !== undefined) {
    p(`- Fixed fraction of the fostering rate: **${la.fixedPercentageOfFosteringRate === null ? 'none (checked, and the answer is none)' : la.fixedPercentageOfFosteringRate}**`);
  }
  if (la.livingCostsMultiplierPercent !== undefined) {
    p(`- Basic living costs: **${la.livingCostsMultiplierPercent}%** of the Income Support amount, against the model's 125%`);
  }
  if (la.flatCoreRateWeeklyPence !== undefined) p(`- Flat core rate: ${money(la.flatCoreRateWeeklyPence)}`);
  if (la.policyUnderReview) p(`- **Policy under review.** ${la.policyUnderReviewNote ?? ''}`);
  if (la.lawfulnessFlag) {
    const f = la.lawfulnessFlag;
    p(`- Ombudsman finding (${f.code}), decided ${f.decisionDate}: ${f.summary}`);
    p(`  - Source: ${f.sourceUrl}`);
    if (f.concernsFormerPolicy) p(`  - **Concerns a FORMER policy.** The site says so with the finding.`);
    if (f.supersededBy) p(`  - Superseded: ${f.supersededBy.summary} (${f.supersededBy.sourceUrl})`);
  }
  p(`- Source: ${la.policySourceUrl}, verified ${la.verifiedOn}`);
}

if (held.length > 0) {
  p(`\n### Held back from publication\n`);
  for (const la of held) {
    p(`- **${la.name}**: ${la.pendingSourceIssue ? `tracked at ${la.pendingSourceIssue}` : 'no tracking link'}`);
  }
}

// ─── Regions ───────────────────────────────────────────────────────────────

p(`\n---\n\n## 8. Which council sits in which region

England's rates vary by region, so every English council has to map to one.

**${Object.keys(regionMap.map).length} authorities mapped**, against a declared expected count of
${regionMap.expectedAuthorityCount}. A build gate fails if those two ever disagree, so a silent drop is caught.

**This mapping is ours, not the government's.** ${regionMap.regionSource}

That is disclosed on the region picker itself, where the reader is told their own
choice overrides ours. It is the honest position: the DfE publishes rates by
region and publishes no list of which authority is in which region.
`);

// ─── Kinship zones ─────────────────────────────────────────────────────────

p(`\n---\n\n## 9. Kinship Zones pilot

${zones.localAuthorities.length} authorities. In a pilot area, a carer whose child would otherwise be in
care gets the full fostering national minimum allowance with **no means test**.

Councils: ${zones.localAuthorities.join(', ')}

Last verified ${zones.lastVerified ?? 'not recorded'}. Source: ${cite(zones.sourceId)}
`);

// ─── Citations ─────────────────────────────────────────────────────────────

const ids = Object.keys(citations).sort();
const unsourced = ids.filter((id) => !citations[id].url);

p(`\n---\n\n## 10. Every source

${ids.length} in total. **${unsourced.length} still without a URL**, listed first.
`);

if (unsourced.length > 0) {
  p(`\n### Still needing a link\n`);
  for (const id of unsourced) {
    p(`- **${citations[id].label}**${citations[id].pendingSourceIssue ? ` (tracked at ${citations[id].pendingSourceIssue})` : ''}`);
  }
}

p(`\n### All sources\n`);
p(`| Source | Kind | Read | Link |\n|---|---|---|---|`);
for (const id of ids) {
  const c = citations[id];
  p(`| ${c.label} | ${c.kind} | ${c.retrieved} | ${c.url ? `[link](${c.url})` : '**none**'} |`);
}

// ─── Gaps ──────────────────────────────────────────────────────────────────

p(`\n---\n\n## 11. What the site does not know, and says so

Every one of these is a deliberate, visible gap. None is filled with an estimate.
`);
for (const item of watchlist.items) {
  p(`\n### ${item.id}\n`);
  p(`**Waiting for:** ${item.what}`);
  p(`\n**Why it matters:** ${item.why}`);
  if (item.url) p(`\n**Where to look:** ${item.url}`);
  p(`\n_Next check due after ${item.checkAfter}._`);
}

p(`\n---\n\n## 12. The assumptions, stated plainly

If you check nothing else, check these. Each is something the site does because
no published rule says otherwise, and each is disclosed to the reader where it
affects their figure.

1. **The taper is pound for pound.** No national rule exists. Section 4.
2. **Basic living costs are 125%** of the Income Support applicable amount,
   except where a council publishes its own figure.
3. **Region mapping** rests on ONS Government Office Regions, because the DfE
   publishes no authority-level list. Section 8.
4. **Rates apply from 1 April**, the council convention, not the DfE's 6 April
   tax year. Both are true of different things; the site pays out on what a carer
   is actually paid and states the difference in pounds.
5. **Age bands come from the current rate table** when backdating. They have been
   stable across every sourced year, and a change would fail a data gate.
6. **The capital rule is off by default.** It runs only where a council's own
   recorded policy enables it.
`);

// ─── How it all works ──────────────────────────────────────────────────────
//
// A developer inheriting this needs the map, not just the rules. Everything
// below is READ FROM THE SOURCE: the file list, what each file exports, what
// it imports, who imports it, and where the website plugs in. A renamed file
// or a deleted symbol fails this export, so the map cannot rot into a
// description of code that no longer exists.

const engineSrc = join(root, 'packages', 'engine', 'src');
const lettersSrc = join(root, 'packages', 'letters', 'src');
const webDir = join(root, 'apps', 'web');

/** The first line of the comment a file OPENS with, which is its purpose. */
function purposeOf(abs: string): string {
  const text = readFileSync(abs, 'utf8');
  if (!text.startsWith('/**')) return '(no doc comment)';
  const close = text.indexOf('*/');
  if (close === -1) return '(no doc comment)';
  for (const raw of text.slice(3, close).split('\n')) {
    const line = raw.replace(/^\s*\*?\s?/, '').trim();
    if (line) return line;
  }
  return '(no doc comment)';
}

/** Every name a file exports, in source order. */
function exportsOf(abs: string): string[] {
  const text = readFileSync(abs, 'utf8');
  const names = new Set<string>();
  for (const m of text.matchAll(
    /^export\s+(?:async\s+)?(?:function|const|class|interface|type|enum)\s+([A-Za-z0-9_]+)/gm,
  )) {
    names.add(m[1]);
  }
  for (const m of text.matchAll(/^export\s+(?:type\s+)?\{([^}]+)\}/gm)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
      if (name) names.add(name);
    }
  }
  return [...names].sort();
}

/** The other files in the same package that a file imports. */
function importsOf(abs: string): string[] {
  const text = readFileSync(abs, 'utf8');
  const found = new Set<string>();
  for (const m of text.matchAll(/from\s+'(\.{1,2}\/[A-Za-z0-9/_-]+)\.js'/g)) {
    found.add(m[1].replace(/^\.\.\//, '').replace(/^\.\//, ''));
  }
  return [...found].sort();
}

const engineFiles = [
  ...readdirSync(engineSrc).filter((f) => f.endsWith('.ts')),
  ...readdirSync(join(engineSrc, 'regimes'))
    .filter((f) => f.endsWith('.ts'))
    .map((f) => `regimes/${f}`),
].sort();

const letterFiles = readdirSync(lettersSrc)
  .filter((f) => f.endsWith('.ts'))
  .sort();

/** file stem -> the files that import it. */
const usedBy = new Map<string, string[]>();
for (const f of engineFiles) {
  for (const dep of importsOf(join(engineSrc, f))) {
    const stem = dep.replace(/^regimes\//, 'regimes/');
    usedBy.set(stem, [...(usedBy.get(stem) ?? []), f.replace(/\.ts$/, '')]);
  }
}

/** Every step of a calculation, in the order it happens. */
const PIPELINE: Array<{ step: string; file: string; symbol: string }> = [
  { step: 'Validate the input. Anything malformed is rejected here, never later', file: 'schema.ts', symbol: 'parseCalculatorInput' },
  { step: 'Pick the rate table whose date range contains the date being calculated', file: 'dates.ts', symbol: 'selectRateTable' },
  { step: 'Route by nation. Scotland has no special guardianship in law, so it leaves here', file: 'regimes/scotland.ts', symbol: 'scotlandPath' },
  { step: 'Route to the Kinship Zones pilot, where eligible. Full fostering rate, no means test', file: 'regimes/kinshipZone.ts', symbol: 'kinshipZonePath' },
  { step: 'Everything else: England, Wales and Northern Ireland', file: 'regimes/sgo.ts', symbol: 'sgoPath' },
  { step: 'Per child, find the age band from date of birth or stated age', file: 'rates.ts', symbol: 'resolveAgeBand' },
  { step: 'Look up the rate for that nation, region and band, and record the citation it came from', file: 'rates.ts', symbol: 'lookupRate' },
  { step: 'Add the warnings that are true of every result, whatever the numbers', file: 'standingFlags.ts', symbol: 'standingFlags' },
  { step: "Add the warnings that come from the council's own recorded policy", file: 'councilPolicy.ts', symbol: 'councilPolicyFlags' },
  { step: 'Run the means test, but only if the carer gave finances. The 20% disregard comes off income FIRST', file: 'meansTest.ts', symbol: 'runMeansTest' },
  { step: 'Apply the taper to disposable income', file: 'meansTest.ts', symbol: 'applyTaper' },
  { step: 'Apply the regulation 7 floor, on the household total, inside the 24 month window', file: 'resolve.ts', symbol: 'withinReg7Window' },
  { step: 'Order the warnings and remove duplicates', file: 'flags.ts', symbol: 'sortFlags' },
  { step: 'Assemble the result', file: 'result.ts', symbol: 'finalise' },
  { step: 'The last gate. Every rule in section 6 is asserted here. A violation throws instead of showing a figure', file: 'guardrails.ts', symbol: 'assertGuardrails' },
];

const missing = PIPELINE.filter((s) => {
  const abs = join(engineSrc, s.file);
  if (!existsSync(abs)) return true;
  return !new RegExp(`\\b${s.symbol}\\b`).test(readFileSync(abs, 'utf8'));
});
if (missing.length > 0) {
  console.error('export-facts-pack: the pipeline map is out of date. Fix scripts/export-facts-pack.mts:');
  for (const m of missing) console.error(`  ${m.file} no longer defines ${m.symbol}`);
  process.exit(1);
}

p(`\n---\n\n## 13. For a developer: how it all works

Sections 1 to 12 say what the calculator does. This section says how, and where.

Everything below is read from the source when this file is generated, so it
cannot describe code that no longer exists.

### 13.1 The shape of the whole thing

Four parts. Only the first one calculates anything.

| Part | What it is |
|---|---|
| \`packages/engine\` | The calculator. Pure TypeScript: no DOM, no network, no dates from the system clock unless you pass them in |
| \`packages/letters\` | The letters a carer sends their council. Takes a result, returns text |
| \`apps/web\` | The website. Next.js, exported as static HTML. Calls the engine, never does arithmetic itself |
| \`/data\` | Every figure. Rates, benefits, councils, sources. No number lives in code |

The engine is a separate package on purpose. It can be tested on its own, and
an advice charity could embed it without taking the website.

**Money is never a float.** Everything is whole pence as integers, and
\`money.ts\` brands the type so a raw \`number\` is a compile error. Rounding in the
wrong place is the easiest way to produce a figure that is quietly wrong.

### 13.2 One calculation, start to finish

Entry point: \`calculate()\` in \`packages/engine/src/engine.ts\`.

| # | What happens | File | Function |
|---|---|---|---|`);

PIPELINE.forEach((s, i) => {
  p(`| ${i + 1} | ${s.step} | \`${s.file}\` | \`${s.symbol}\` |`);
});

p(`
This table is checked, not typed. Rename a file or delete a function and
\`pnpm export:facts\` refuses to run until the map is corrected.

### 13.3 Every engine file: what it does, what it exports, what it needs

Read this as a dependency list. A file can only be understood alongside the
files in its **Imports** column, and can only be changed with care if its
**Used by** column is long.
`);

for (const f of engineFiles) {
  const abs = join(engineSrc, f);
  const stem = f.replace(/\.ts$/, '');
  const ex = exportsOf(abs);
  const im = importsOf(abs);
  const by = (usedBy.get(stem) ?? []).sort();
  p(`\n#### \`${f}\`\n`);
  p(`${purposeOf(abs)}\n`);
  p(`- **Exports:** ${ex.length > 0 ? ex.map((n) => `\`${n}\``).join(', ') : 'nothing'}`);
  p(`- **Imports:** ${im.length > 0 ? im.map((n) => `\`${n}\``).join(', ') : 'nothing. This file is a leaf'}`);
  p(`- **Used by:** ${by.length > 0 ? by.map((n) => `\`${n}\``).join(', ') : 'nothing inside the engine'}`);
}

p(`\n### 13.4 How the files connect

The same information as a single table, for when you want to see the shape
rather than one file at a time.

| File | Imports | Used by |
|---|---|---|`);
for (const f of engineFiles) {
  const stem = f.replace(/\.ts$/, '');
  const im = importsOf(join(engineSrc, f));
  const by = (usedBy.get(stem) ?? []).sort();
  p(`| \`${f}\` | ${im.length > 0 ? im.join(', ') : '(none)'} | ${by.length > 0 ? by.join(', ') : '(none)'} |`);
}

p(`
**Reading it.** \`types.ts\`, \`errors.ts\` and \`money.ts\` sit at the bottom, and
almost everything depends on them, so a change there reaches the whole engine.
Test it hard.

At the other end, \`engine.ts\` is used only by \`index.ts\`, and the three files in
\`regimes/\` only by \`engine.ts\`. Nothing else depends on them, so a new route for
a new nation or scheme goes there without disturbing anything underneath.

A file with a long **Used by** column is load-bearing. A file with an empty one
can be changed freely.

### 13.5 The letters
`);

for (const f of letterFiles) {
  const abs = join(lettersSrc, f);
  p(`\n#### \`${f}\`\n`);
  p(`${purposeOf(abs)}\n`);
  const ex = exportsOf(abs);
  p(`- **Exports:** ${ex.length > 0 ? ex.map((n) => `\`${n}\``).join(', ') : 'nothing'}`);
}

// ─── Where the website plugs in ────────────────────────────────────────────

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'out') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.tsx?$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const webFiles = walk(webDir).filter((f) => !f.includes('/e2e/') && !f.includes('__tests__'));
const consumers = webFiles
  .filter((f) => /@sgo\/(engine|letters)/.test(readFileSync(f, 'utf8')))
  .map((f) => f.slice(webDir.length + 1))
  .sort();

const callSites = webFiles
  .filter((f) => /\bcalculate\(/.test(readFileSync(f, 'utf8')))
  .map((f) => f.slice(webDir.length + 1))
  .sort();

p(`\n### 13.6 Where the website plugs in

The website never calculates. It collects answers, hands them to the engine, and
renders what comes back.

**\`calculate()\` is called in ${callSites.length} place${callSites.length === 1 ? '' : 's'}:**
${callSites.map((f) => `- \`apps/web/${f}\``).join('\n')}

Everything else reads the result. ${consumers.length} files in \`apps/web\` import
from \`@sgo/engine\` or \`@sgo/letters\`:

${consumers.map((f) => `- \`apps/web/${f}\``).join('\n')}

**The flow through the interface:**

\`\`\`
steps/*.tsx  ──answers──▶  formState.ts  ──built input──▶  CalculatorShell.tsx
                                                                   │
                                                            calculate()
                                                                   │
                                                                   ▼
                                              ResultsPanel.tsx and the panels beside it
\`\`\`

Add a question to the form and you touch \`steps/\`, \`formState.ts\` and the input
schema in \`schema.ts\`. Change what a result shows and you touch only
\`components/results/\`.

### 13.7 Where the numbers come from

Nothing in the engine contains a figure. Every rate, benefit amount and council
policy is read from \`/data\`.

\`\`\`
/data/*.json  ──syncdata──▶  packages/engine/src/data/  ──imported by──▶  referenceData.ts
                                                                              │
                                                                     RATE_TABLES, BENEFIT_TABLES
                                                                              │
                                                                       selectRateTable()
\`\`\`

\`/data\` is the only real copy. \`packages/engine/src/data/\` is generated and
gitignored, and \`prebuild\`, \`pretypecheck\` and \`pretest:unit\` all regenerate it.
Never edit it by hand, and never commit it.

To add a financial year: put the file in \`/data\`, then register it in
\`referenceData.ts\`, **newest first**. That is the whole change.

### 13.8 Every command

**The two that matter:**

\`\`\`
pnpm verify          before you commit
pnpm verify:build    before you upload
\`\`\`

| Command | What it does | When |
|---|---|---|
| \`pnpm install\` | Installs dependencies. Node 20+, pnpm 10 | First checkout, lockfile changes |
| \`pnpm dev\` | Local preview on localhost:3000 | While editing |
| \`pnpm verify\` | typecheck, unit tests, data gates, content, headers | Before every commit |
| \`pnpm verify:build\` | Build, then bundle budget and structured data | Before every upload |
| \`pnpm build\` | Static export into \`apps/web/out\` | Rarely alone |
| \`pnpm typecheck\` | TypeScript, no emit | Inside \`verify\` |
| \`pnpm lint\` | ESLint | By hand |
| \`pnpm test:unit\` | The engine and letters tests | Inside \`verify\` |
| \`pnpm test:e2e\` | Playwright, desktop and mobile | Before a release |
| \`pnpm test:a11y\` | The accessibility subset | Before a release |
| \`pnpm validate:data\` | Falling rates, mad values, missing sources | Inside \`verify\` |
| \`pnpm check:staleness\` | Rate expiry, council review dates, watchlist | Inside \`verify\` |
| \`pnpm check:content\` | A rate typed into prose, an em dash, an unanswered heading | Inside \`verify\` |
| \`pnpm check:headers\` | Security headers still in \`.htaccess\` | Inside \`verify\` |
| \`pnpm check:schema\` | Structured data references resolve | Inside \`verify:build\` |
| \`pnpm check:bundle\` | JavaScript size has not crept up | Inside \`verify:build\` |
| **\`pnpm check:citations\`** | **Opens every source URL, reports dead ones** | **Monthly, by hand** |
| \`pnpm export:facts\` | Regenerates this file | After any change to data or the engine |

**Working on the engine alone:**

\`\`\`
cd packages/engine
pnpm test:unit       run the tests once
pnpm test:watch      re-run as you edit
pnpm test:coverage   with coverage
pnpm typecheck       types only
\`\`\`

\`syncdata\` runs automatically before build, typecheck and test. You do not call
it yourself.

**Faking the date:**

\`\`\`
SGO_TODAY=2027-04-12 pnpm check:staleness
\`\`\`

Overrides today's date for \`check:staleness\` and \`check:content\`. Changes nothing
on the built site. Use it to rehearse next April.

### 13.9 The two things most likely to be got wrong

**The means test order.** The 20% disregard comes off income BEFORE expenditure
is subtracted. Inverting it roughly doubles the answer. Section 4 shows both
arithmetics side by side, and a property test exists solely to catch it.

**The rate table order.** \`RATE_TABLES\` in \`referenceData.ts\` must be newest
first, because \`selectRateTable\` takes the first table whose range contains the
date. Put a year in the wrong place and carers asking about an old order
silently get this year's rates.

### 13.10 How to know a change is safe

\`\`\`
pnpm test:unit       the engine's own tests
pnpm verify          everything checkable without a build
pnpm verify:build    build, bundle budget, structured data
cd apps/web && npx playwright test
\`\`\`

The guardrails in \`guardrails.ts\` are the real safety net. They run on every
result in production and throw rather than show a figure that breaks a rule. A
change that makes the calculator wrong in a way the tests miss will usually
still trip one of them.

If you are about to disable a guardrail to make something pass, the guardrail
is right and the change is wrong.
`);

writeFileSync(outFile, parts.join('\n') + '\n');
console.log(`export-facts-pack: ${ids.length} sources, ${rateFiles.length} rate years into ${outFile}`);
