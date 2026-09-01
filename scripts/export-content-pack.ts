/**
 * Build the pack a copywriter needs to rewrite the site.
 *
 * The brief (CONTENT-BRIEF-REQUEST.md) promises the writer three things: the
 * existing copy, the sources behind every claim, and a marker on what is
 * highest risk. Handing over sixteen .mdx files does not do that. A writer who
 * cannot see that a sentence rests on a 2010 High Court case will rewrite it
 * into something the case does not support, and nobody will notice until a
 * solicitor reads it, which is the expensive end of the process.
 *
 * So each page goes out twice: once readable, with the components spelled out
 * in English and the sources resolved to their titles, and once as the original
 * file, so nothing is lost in translation.
 *
 * Run: pnpm export:content
 */
import { readFileSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'apps', 'web', 'content', 'guidance');
const out = join(root, 'content-pack');

interface Citation {
  label: string;
  url: string;
  kind: string;
  holding?: string;
}
const citations = JSON.parse(
  readFileSync(join(root, 'data', 'citations.json'), 'utf8'),
) as Record<string, Citation>;

const lettersSrc = readFileSync(join(root, 'packages', 'letters', 'src', 'index.ts'), 'utf8');
const letterTitles = new Map<string, string>();
for (const m of lettersSrc.matchAll(/'([a-z0-9-]+)':\s*\{\s*\n\s*title:\s*(['"])(.*?)\2/g)) {
  letterTitles.set(m[1]!, m[3]!);
}

/** Pages whose wording carries the most legal weight, flagged for the writer. */
const HIGH_RISK = new Set([
  'child-benefit-deduction',
  'fixed-percentage-policies',
  'former-foster-carers',
  'what-your-council-must-consider',
  'complaining-to-the-ombudsman',
]);

function sourceLine(id: string): string {
  const c = citations[id];
  if (!c) return `- ${id} (NOT FOUND, tell the developer)`;
  const where = c.url ? c.url : 'no public link yet, we are still sourcing one';
  return `- **${c.label}**\n  ${where}${c.holding ? `\n  What it decided: ${c.holding}` : ''}`;
}

/** Turn the page's components into something a non-developer can read. */
function readable(body: string): string {
  return body
    .replace(/<RateTable\s*\/>/g,
      '> **[LIVE TABLE]** The current allowance rates are inserted here automatically from our\n' +
      '> data. Do not write any figures into the copy. Mark where a table belongs and we place it.')
    .replace(/<Cite\s+id="([^"]+)"\s*\/>/g, (_m, id: string) => {
      const c = citations[id];
      return `*[SOURCE: ${c ? c.label : id}]*`;
    })
    .replace(/<CalculatorCTA\s*\/>/g, '> **[BUTTON]** Takes the reader to the calculator.')
    .replace(/<AdviceLines\s*\/>/g,
      '> **[LIST]** The advice line contact details are inserted here automatically.')
    .replace(/<LetterCTA\s+template="([^"]+)"\s*\/>/g, (_m, t: string) =>
      `> **[BUTTON]** Opens the letter template: "${letterTitles.get(t) ?? t}".`)
    .replace(/<Callout\s+type="critical">/g, '> **Important box, shown in red:**\n>')
    .replace(/<Callout\s+type="important">/g, '> **Important box, shown in amber:**\n>')
    .replace(/<Callout>/g, '> **Highlighted box:**\n>')
    .replace(/<\/Callout>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'pages-readable'), { recursive: true });
mkdirSync(join(out, 'pages-original'), { recursive: true });

const files = readdirSync(contentDir).filter((f) => f.endsWith('.mdx')).sort();
const index: Array<{ slug: string; title: string; words: number; bodyWords: number; risk: boolean }> = [];

for (const file of files) {
  const raw = readFileSync(join(contentDir, file), 'utf8');
  const { data, content } = matter(raw);
  const slug = String(data.slug ?? file.replace('.mdx', ''));
  const cites = (data.citations as string[] | undefined) ?? [];
  const letters = (data.relatedLetters as string[] | undefined) ?? [];
  const faq = (data.faq as Array<{ q: string; a: string }> | undefined) ?? [];

  // The writer rewrites the description and the questions too, so counting the
  // body alone would understate the job by about a third.
  const count = (t: string): number => t.split(/\s+/).filter(Boolean).length;
  const bodyWords = count(content);
  const extraWords =
    count(String(data.description ?? '')) + faq.reduce((n, f) => n + count(f.q) + count(f.a), 0);
  const words = bodyWords + extraWords;
  index.push({ slug, title: String(data.title), words, bodyWords, risk: HIGH_RISK.has(slug) });

  const page = [
    `# ${String(data.title)}`,
    '',
    HIGH_RISK.has(slug)
      ? '> **HIGHEST RISK PAGE.** The wording here carries legal weight. Brief this one hardest\n' +
        '> and have the solicitor spend the most time on it.\n'
      : '',
    [
      '| | |',
      '|---|---|',
      `| Web address | /guidance/${slug} |`,
      `| Length now | ${words} words (${bodyWords} in the page, ${extraWords} in the description and questions) |`,
      `| Last reviewed | ${String(data.lastReviewed ?? 'not set')} |`,
      `| Review needed every | ${String(data.reviewEvery ?? 'not set')} |`,
    ].join('\n'),
    '## One line description',
    '',
    'Shown on search results and link previews. The rewrite needs one of these too.',
    '',
    `> ${String(data.description ?? '')}`,
    '',
    '## Sources this page relies on',
    '',
    cites.length
      ? 'Every legal claim on the page must still trace to one of these after the rewrite.\n' +
        'The writer may not add a claim we cannot cite.\n\n' + cites.map(sourceLine).join('\n')
      : 'None recorded. This page makes no legal claim of its own.',
    '',
    (data.literalMoneyAllowed as string[] | undefined)?.length
      ? '## Note on the figures in this page\n\n' +
        'This is the one page allowed to print pound amounts, because they are invented\n' +
        'worked examples rather than real rates. They are listed as exceptions in the page\n' +
        'settings and each one has to be justified there. Keep them as examples, and do not\n' +
        'add any real rates.'
      : '',
    letters.length
      ? `## Letter template linked from this page\n\n${letters
          .map((l) => `- "${letterTitles.get(l) ?? l}"`)
          .join('\n')}\n`
      : '',
    '## The page as it reads now',
    '',
    readable(content),
    '',
    faq.length
      ? `## Questions and answers shown at the bottom of the page\n\n${faq
          .map((f) => `**${f.q}**\n\n${f.a}\n`)
          .join('\n')}`
      : '',
  ]
    .filter((s) => s !== '')
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n');

  writeFileSync(join(out, 'pages-readable', `${slug}.md`), `${page}\n`);
  writeFileSync(join(out, 'pages-original', file), raw);
}

const total = index.reduce((n, p) => n + p.words, 0);

const indexDoc = `# The sixteen guidance pages, as they read today

Exported ${new Date().toISOString().slice(0, 10)} for the content brief team.

${index.length} pages, ${total.toLocaleString('en-GB')} words in total.

## What is in this pack

- **pages-readable/** is what you want. One file per page, in plain Markdown,
  with the sources spelled out and the moving parts described in English.
- **pages-original/** is the same content in the format the website actually
  uses. Handed over so nothing is lost, and so the developer can check the
  rewrite against it. The writer does not need to open these.

## The pages

| Page | Words to rewrite | Address |
|---|---|---|
${index
  .map(
    (p) =>
      `| ${p.risk ? '**' : ''}${p.title}${p.risk ? '** (highest risk)' : ''} | ${p.words} | /guidance/${p.slug} |`,
  )
  .join('\n')}

## Five things the writer has to know before starting

**1. The strength of a word is a legal decision, not a style decision.** If a
source says "should", the copy says "should". Making a claim land harder is not
the writer's call. Flag every word choice that carries weight rather than
quietly picking one.

**2. Never write a figure.** No pound amounts anywhere in the prose. The rates
change every April and are inserted automatically from our data. An automatic
check rejects the copy if a figure appears in it. Mark where a number belongs.
The one exception is the means test page, which uses invented worked examples
to show an order of operations. Those are listed as exceptions in that page's
settings and each has to be justified. They are not real rates.

**3. Never say a named council broke the law.** Say what the guidance requires
and what a published decision found, and let the reader draw the conclusion.
This is a hard rule.

**4. No em dashes.** An automatic check fails the build if one appears. Commas,
full stops, colons and brackets cover every case.

**5. Every claim needs a source.** The sources for each page are listed in its
file. The writer may not introduce a claim we cannot cite. If they believe
something is true and we have no source, it goes on a query list and stays out
of the copy.

## Who this is for

Grandparents and other family carers, mostly aged 55 to 75, often reading at a
stressful moment and sometimes after being given wrong information by their
council. Target reading age 12 to 14. Many are on a phone.

Where precision needs a longer sentence, take the longer sentence. Accuracy
beats brevity on this site every time.

## What is not in this pack

The words inside the calculator itself: the warnings shown on a carer's result,
and the eight letter templates they send to their council. Those are the highest
risk copy on the whole site and they need rewriting too. Ask and we will export
them the same way.
`;

writeFileSync(join(out, '00-INDEX.md'), indexDoc);

const sourcesDoc = `# Every source the site relies on

Exported ${new Date().toISOString().slice(0, 10)}. ${Object.keys(citations).length} sources.

Each page lists the ones it uses. This is the full set, for reference.

A blank link means we hold the source but have not yet found a permanent public
address for it. That is tracked and is not an invitation to drop the claim.

${Object.entries(citations)
  .sort((a, b) => a[1].label.localeCompare(b[1].label))
  .map(
    ([id, c]) =>
      `### ${c.label}\n\n- Reference: \`${id}\`\n- Kind: ${c.kind}\n- Link: ${
        c.url || 'no public link yet'
      }${c.holding ? `\n- What it decided: ${c.holding}` : ''}`,
  )
  .join('\n\n')}
`;
writeFileSync(join(out, 'SOURCES.md'), sourcesDoc);

console.log(
  `export-content-pack: ${index.length} pages (${total} words) into content-pack/, ` +
    `plus ${Object.keys(citations).length} sources.`,
);
