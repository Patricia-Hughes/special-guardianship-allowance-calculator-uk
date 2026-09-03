/**
 * One file with everything in it.
 *
 * A writer handed the site alone rewrites sentences without knowing which ones
 * are load-bearing. A writer handed the research alone does not know what the
 * site currently says. This puts both in one document, in the order a person
 * would want them: what the thing is, how it decides, what it says, what that
 * rests on, and only then the paperwork behind it.
 *
 * Everything here is assembled from files that already exist, so the brief
 * cannot drift from the product. The one piece written by hand is Part 2, the
 * plain-English account of how the calculator decides, because that lives in
 * the code and nowhere else.
 *
 * Run: pnpm export:brief   (run export:content-bundle and export:facts first)
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = join(root, 'content-bundle');
const outFile = join(root, 'COMPLETE-BRIEF.md');

/** Anything the source documents live in, so a missing one is loud rather than silent. */
const need = (path: string, what: string): string => {
  if (!existsSync(path)) {
    throw new Error(`${what} is missing at ${path}. Run the exporters first: pnpm export:content-bundle && pnpm export:facts`);
  }
  return readFileSync(path, 'utf8');
};

/**
 * Push every heading in an included file down a level or two.
 *
 * Without it the parts collide: a page whose own heading is `# /rates` would
 * sit at the same level as `# Part 4`, and the table of contents in any editor
 * becomes a flat list of forty things with no shape.
 */
const demote = (md: string, by: number): string =>
  md.replace(/^(#{1,5}) /gm, (_m, hashes: string) => '#'.repeat(hashes.length + by) + ' ');

/** Drop a file's own front matter: its title and any "how to use this" preamble. */
const bodyAfterFirstRule = (md: string): string => {
  const i = md.indexOf('\n---\n');
  return i === -1 ? md : md.slice(i + 5);
};

const uploads = '/root/.claude/uploads';
const givenFile = (needle: string): string | null => {
  if (!existsSync(uploads)) return null;
  for (const dir of readdirSync(uploads)) {
    const full = join(uploads, dir);
    let entries: string[] = [];
    try {
      entries = readdirSync(full);
    } catch {
      continue;
    }
    const hit = entries.find((f) => f.includes(needle));
    if (hit) return readFileSync(join(full, hit), 'utf8');
  }
  return null;
};

// ─── Part 2, the only part written rather than assembled ───────────────────

const HOW_IT_WORKS = `
The calculator answers one question: **what should my council be paying me?**
It answers it in a fixed order, and every step either finds a published figure
or refuses. Nothing is estimated, interpolated or averaged.

### The order it goes in

**1. Where do you live.** The nation decides which set of rules runs at all.
England, Wales and Northern Ireland go through the special guardianship rules.
Scotland does not, and this matters: special guardianship orders **do not exist
in Scots law**. A Scottish kinship carer is under a different scheme entirely,
so the site routes them away from the English rules and refuses to attach any
English law to their answer. If it ever did, the engine stops rather than
showing it.

**2. Which rate table.** Rates change on 1 April. The table is picked by date,
and if the date falls in a year whose rates have not been read from a published
source, the answer is refused rather than borrowed from a neighbouring year.

**3. What each child is worth.** Each child's age puts them in a band, and the
band plus the region gives a weekly figure. England pays by region, which is why
an English carer must give either a region or a council. Everywhere else has one
national table.

**4. Stop here if no finances were given.** This is the number most people came
for, and it is shown before anyone is asked about money. That ordering is
deliberate: a means test the carer may not want to complete must never stand
between them and the ceiling figure.

**5. If finances were given, work out the contribution.** The means test comes
from the government's standardised model. It is **not law**, it pre-dates
Universal Credit, and every result that uses it says so. The order of its steps
is the part people get wrong:

- add up the income that counts
- **take 20% off the income, before any outgoings**
- take off the allowable outgoings: rent, council tax, childcare, essential
  loans, maintenance paid out, pension contributions
- take off basic living costs, which are the Income Support rates for a
  household that size, plus 25% (some councils allow less; Devon allows 100%
  rather than 125%, and the site says so when it applies)
- what is left is what the council expects the carer to put in

Doing the 20% at the end instead of the start roughly doubles the answer. There
is a test that exists only to catch that.

**6. Share the contribution across the children.** In proportion to what each
child is worth, using a method that guarantees the parts add up to the whole
with no penny lost or invented.

**7. Take off Child Benefit, but only if asked.** Never by default, never
silently. If the carer is on means-tested benefits and ticks it anyway, a
critical warning fires, because the Ombudsman has found against a council for
deducting it as a blanket rule.

**8. Apply the regulation 7 floor.** A carer who fostered the child before the
order can keep receiving the reward part of their fostering allowance for two
years. The figure they give is **what they were paid in total**, for every child
they were fostering, so the floor applies to the household total rather than to
each child, and it is shared back across the children.

**9. Check the answer before showing it.** Every result passes a set of
assertions before it leaves the engine. If any fail, the carer sees "we cannot
estimate this" and the advice lines, never a wrong figure.

### What the calculator refuses to do

This is the part a writer most needs to keep. The site's credibility rests on
these refusals, and softening the wording around them undoes the work.

- **It will not invent a disability enhancement.** There is no national figure
  for one. The site says so and tells the carer to ask.
- **It will not guess a historic rate.** A year with no sourced figures is left
  out of a backdating total, with the gap stated.
- **It will not present a fixed fraction as the answer.** Two-thirds, 75%, 58%
  and half have all been litigated. If a result lands on one without a means
  test, the engine stops.
- **It will not put money in a URL.** A shared link carries the area and the
  children's ages, and nothing about anyone's finances.
- **It will not claim a council is at fault** unless an Ombudsman finding is
  recorded, sourced and dated, and it says in the same breath where the council
  has since changed the policy.

### Where the words a carer reads come from

Three places, which is why a rewrite that only touches one of them leaves the
site inconsistent. This has already happened twice with the regulation 7 wording.

| What | Where it lives | In this brief |
|---|---|---|
| The pages and guides | Markdown files a writer can edit directly | Parts 4 and 12 |
| The form's questions and hints | Inside the calculator's code | Part 5 |
| The warnings and the letters | Inside the engine's code | Parts 6 and 7 |
`;

const RULES = `
Ten rules run through the whole build. Nine are enforced by code that stops the
site rather than trusting anyone to remember. A writer needs them because
several of them are about **wording**, and a rewrite can break one without
touching a line of code.

| # | Rule | What it means for the words |
|---|---|---|
| R1 | Never output a fixed percentage of the fostering rate as the answer | Do not describe any figure as "two thirds of" or "a share of" the fostering rate |
| R2 | A Child Benefit deduction is never silent | The opt-in wording must stay an opt-in; never imply it happens automatically |
| R3 | Every figure carries the source it came from | Do not remove a "where this comes from" line, even if it reads awkwardly |
| R4 | A former foster carer is never shown less than their old allowance, within two years | Regulation 7 is a **power a council has**, not a protection the carer holds. Never write "protected" |
| R5 | No English law on a Scottish result | Never add an English case or regulation to Scottish copy |
| R6 | The means test model is not law | Always say it is a model most councils use, never "the rules" |
| R7 | Independent advice is offered on every result | Do not cut the advice organisations |
| R8 | No financial or family data leaves the browser | Do not write anything implying an account, a save, or a submission |
| R9 | Nothing is published about a named council without a dated source | Do not sharpen a claim about a council |
| R10 | Rates are never written into the text | Never type a figure into prose. Every amount is inserted from the data, so it updates itself each April |
`;

// ─── Assemble ──────────────────────────────────────────────────────────────

const bundleFile = (rel: string, what: string): string => need(join(bundle, rel), what);
const pagesDir = join(bundle, '01-pages');
const lettersDir = join(bundle, '04-letters');
const guidesDir = join(bundle, '07-guide-source');

const pageFiles = readdirSync(pagesDir).sort();
const letterFiles = readdirSync(lettersDir).filter((f) => f !== 'README.md').sort();
const guideFiles = readdirSync(guidesDir).sort();

const part = (n: number, title: string, body: string): string =>
  `\n\n<a id="part-${n}"></a>\n\n# Part ${n}. ${title}\n\n${body.trim()}\n`;

const given = (needle: string, heading: string, note: string): string => {
  const text = givenFile(needle);
  if (!text) return `\n\n## ${heading}\n\n_Not available in this session._\n`;
  return `\n\n## ${heading}\n\n${note}\n\n${demote(text, 2)}\n`;
};

const parts: string[] = [];

parts.push(`# The complete brief

**Everything about this site in one file.** Written for a copywriter who has not
seen the project before, so that no research is needed before starting.

Generated ${new Date().toISOString().slice(0, 10)} from the site itself and from the
research it was built on. Nothing here is a summary of the code from memory: the
pages, the form, the warnings, the letters, the figures and the sources are all
read out of the running product.

---

## What is in here

| Part | What it is | Why a writer needs it |
|---|---|---|
| [1](#part-1) | What the site is and who reads it | The audience decides every wording choice |
| [2](#part-2) | **How the calculator works** | The logic, in plain English, in the order it runs |
| [3](#part-3) | The ten rules that cannot be broken | Several are about wording, not code |
| [4](#part-4) | Every page, every word | What the site says today |
| [5](#part-5) | The calculator, screen by screen | These words are inside the code, not in any content file |
| [6](#part-6) | The result page, fully opened | What a carer sees after pressing the button |
| [7](#part-7) | All 34 warnings | Shown only when a carer's answers trigger them |
| [8](#part-8) | All 9 letters | Word for word, as a carer sends them to their council |
| [9](#part-9) | Every figure, and where it comes from | The numbers, the arithmetic and the assumptions |
| [10](#part-10) | Every source | 57 documents, and what each one actually says |
| [11](#part-11) | The guides in editable form | Edit these and hand them straight back |
| [12](#part-12) | The research this was built on | The original findings, unedited |
| [13](#part-13) | The reviews, and what changed because of them | Why some sentences are worded the way they are |
| [14](#part-14) | The original build specification | The full technical brief, for reference |

## Two things to know before rewriting anything

**Figures are never typed into prose.** Every amount on the site is inserted from
a data file, so it updates itself every April. If you type "£255" into a
sentence, it becomes wrong on 1 April and nothing will catch it. A build check
rejects this. Where you need a figure in a sentence, leave the placeholder
alone.

**Some sentences are load-bearing.** They are the site's answer to "on what
basis do you say that?", and they are worded to match what a source actually
says rather than what would read better. Part 3 lists which ones. Where a
sentence looks weak or hedged, check Part 10 before strengthening it: it is
usually hedged because the source does not support more.
`);

parts.push(
  part(
    1,
    'What the site is, and who reads it',
    `This is a calculator for special guardians in the UK: grandparents, aunts,
older siblings and family friends raising a child under a special guardianship
order. It tells them what their council should be paying, what the law says the
council must consider, and what to do when the figure looks wrong.

**The readers are mostly 55 to 75.** Often grandparents. Often on a phone or an
older tablet. Usually reading once, at a stressful moment, having just been told
a number by a social worker that they suspect is too low. Many are not confident
with forms or with money language, and most will never come back to the site a
second time.

That shapes everything:

- Body text is 18px, not 16px, and never smaller than 16px anywhere.
- Nothing is saved, because a shared or family computer is the normal case.
- The most important number is shown **before** any question about money.
- The reading level is deliberately plain. Short sentences. No jargon without an
  explanation beside it.

**The most valuable output is not the number.** It is a carer who knows what to
ask, has the legal basis in front of them, and has a letter ready to send. A
rewrite that makes the number more prominent and the reasoning less so would
make the site worse at its job.`,
  ),
);

parts.push(part(2, 'How the calculator works', HOW_IT_WORKS));
parts.push(part(3, 'The ten rules that cannot be broken', RULES));

parts.push(
  part(
    4,
    'Every page, every word',
    `Every page as a reader sees it, with the browser tab title and the description
that shows in search results. The header and footer wrap all of them, so a change
there changes the whole site.\n\n` +
      pageFiles
        .map((f) => demote(readFileSync(join(pagesDir, f), 'utf8'), 1))
        .join('\n\n---\n\n'),
  ),
);

parts.push(
  part(
    5,
    'The calculator, screen by screen',
    `**These words exist nowhere except inside the code.** A writer given the content
files alone would rewrite the guides and never see a single question the
calculator asks. Captured from the running site, so this is exactly what a carer
reads.\n\n` + demote(bodyAfterFirstRule(bundleFile('02-calculator/every-step.md', 'The calculator screens')), 1),
  ),
);

parts.push(
  part(
    6,
    'The result page',
    demote(bodyAfterFirstRule(bundleFile('02-calculator/result-page.md', 'The result page')), 1),
  ),
);

parts.push(part(7, 'Every warning', demote(bodyAfterFirstRule(bundleFile('03-warnings.md', 'The warnings')), 1)));

parts.push(
  part(
    8,
    'Every letter',
    `Nine letters, each pre-filled with the carer's own council, area and figures.
They go to a social worker the carer will deal with for years, so they are
polite, short and specific. Rewrite for clarity, not for strength.\n\n` +
      letterFiles
        .map((f) => demote(readFileSync(join(lettersDir, f), 'utf8'), 1))
        .join('\n\n---\n\n'),
  ),
);

parts.push(
  part(
    9,
    'Every figure, and where it comes from',
    `The complete numeric and legal record: every rate, the arithmetic behind the
means test, the backdating logic, what is held about individual councils, and
what the site knows it does not know.\n\n` +
      demote(bodyAfterFirstRule(need(join(root, 'CALCULATOR-FACTS.md'), 'The facts pack')), 1),
  ),
);

parts.push(part(10, 'Every source', demote(bodyAfterFirstRule(bundleFile('05-sources.md', 'The sources')), 1)));

parts.push(
  part(
    11,
    'The guides in editable form',
    `The sixteen guides exactly as they are stored. Edit these and hand them back.

The tags in angle brackets insert live figures and source links: \`<RateTable />\`
draws the current rate table, \`<Cite id="..." />\` prints a source, and
\`<BenefitAmount />\` inserts a benefit figure. **Leave them alone.** They are how
the numbers stay right every April.\n\n` +
      guideFiles
        .map((f) => `## ${f}\n\n\`\`\`mdx\n${readFileSync(join(guidesDir, f), 'utf8')}\`\`\``)
        .join('\n\n---\n\n'),
  ),
);

parts.push(
  part(
    12,
    'The research this was built on',
    `The original research, unedited. This is where the figures and the legal
positions came from, including the dead ends and the things that could not be
found.` +
      given('SGOresearchfindingsresponse', 'Research findings: what the calculator could not answer', 'The first round: the open questions and what the research settled.') +
      given('JOBBresearchfindings', 'Job B research findings', 'The second round: rates, councils and Ombudsman decisions.') +
      given('researcherthreedocuments', 'The third research round', 'The final round, and the gaps accepted as closed.'),
  ),
);

parts.push(
  part(
    13,
    'The reviews, and what changed',
    `Three reviews by legal and research specialists. **Read this before softening
any hedged sentence.** Several sentences on the site are worded cautiously
because a review found the stronger version was not supported.` +
      given('JOBAfinalreview', 'The legal review', 'A lawyer reading every legal claim on the site.') +
      given('FORYOURREVIEWERanswered', 'The legal review, answered', 'The corrections, and the answers to the questions the review left open.') +
      given('calculatorfactsreview', 'The research team on the figures', 'Every rate cross-checked against the source documents.'),
  ),
);

parts.push(
  part(
    14,
    'The original build specification',
    `The technical brief the site was built from. A writer does not need this to
rewrite the copy, and it is here so that nothing is missing.` +
      given('SGOcalculatordeveloperspec', 'Developer build specification', 'The full specification, version 2.0.'),
  ),
);

const doc = parts.join('\n');
writeFileSync(outFile, doc.replace(/\n{4,}/g, '\n\n\n') + '\n');

const words = doc.split(/\s+/).filter(Boolean).length;
console.log(
  `export-master-brief: ${parts.length} parts, ${pageFiles.length} pages, ` +
    `${letterFiles.length} letters, ${guideFiles.length} guides, ` +
    `${words.toLocaleString('en-GB')} words into ${outFile}`,
);
