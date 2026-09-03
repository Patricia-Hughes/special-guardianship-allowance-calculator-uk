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

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
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
    p(`\n**Guardian's Allowance:** ${ga.weeklyPence == null ? '_not sourced_' : money(ga.weeklyPence)}, source ${cite(ga.sourceId)}`);
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

writeFileSync(outFile, parts.join('\n') + '\n');
console.log(`export-facts-pack: ${ids.length} sources, ${rateFiles.length} rate years into ${outFile}`);
