/**
 * Everything a reader can see, in one file, for the content rewrite.
 *
 * Taken from the BUILT SITE rather than from the source, because that is the
 * only way to be sure nothing is missed. Copy lives in three different places
 * here: MDX for the guidance, TSX for the static pages and the calculator, and
 * TypeScript for the warnings and letters. A writer given only the MDX would
 * rewrite half the site and never see the other half, which is exactly what
 * happened to the reg 7 wording twice.
 *
 * Run: pnpm export:writer
 */

import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'apps', 'web', 'out');
const outFile = join(root, 'WEBSITE-CONTENT.md');

// ─── Turning a built page back into readable text ──────────────────────────

const BLOCK = 'address|article|aside|blockquote|details|div|dl|fieldset|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|summary|table|tr|ul';

/**
 * A deliberately small HTML to markdown pass.
 *
 * It only needs to handle what this site actually emits, and the site emits
 * plain semantic HTML. Anything cleverer would be a dependency for no gain.
 */
/**
 * Rate tables, as tables.
 *
 * Stripping the tags row by row produced a run of loose pipes with the caption
 * welded to the header, which is unreadable in the one file a writer works
 * from. This rebuilds each table as real markdown: caption above it in bold,
 * then a header row, then the separator that makes it render.
 */
function tables(html: string): string {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/g, (_all, inner: string) => {
    const caption = /<caption[^>]*>([\s\S]*?)<\/caption>/.exec(inner)?.[1] ?? '';
    const rows: string[][] = [];
    for (const [, row] of inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const cells = [...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(([, cell]) =>
        cell.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      );
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length === 0) return '';

    const width = Math.max(...rows.map((r) => r.length));
    const pad = (r: string[]): string => `| ${[...r, ...Array(width - r.length).fill('')].join(' | ')} |`;
    const [header, ...body] = rows as [string[], ...string[][]];
    const lines = [pad(header), `|${' --- |'.repeat(width)}`, ...body.map(pad)];
    const title = caption.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return `\n\n${title ? `**${title}**\n\n` : ''}${lines.join('\n')}\n\n`;
  });
}

function toMarkdown(html: string): string {
  let s = html;

  // The head. Its <title> is captured separately as metadata, and left in the
  // body it renders as a stray bullet at the top of every page.
  s = s.replace(/[\s\S]*?<body[^>]*>/, '');

  // The calculator form itself: questions, labels, hints and buttons. It is UI
  // rather than prose, it is out of scope for the rewrite, and on the home page
  // it is long enough to bury the copy around it.
  s = s.replace(/<div class="calculator-form"[\s\S]*?<\/div>\s*(?=<div|<section|<noscript|<p)/g, '');

  // The chrome. The masthead and footer are identical on all 26 pages, and
  // repeating them 26 times buries the page's own copy in navigation.
  s = s.replace(/<header class="masthead[\s\S]*?<\/header>/g, '');
  s = s.replace(/<footer class="site-footer[\s\S]*?<\/footer>/g, '');
  s = s.replace(/<a [^>]*href="#main"[^>]*>[\s\S]*?<\/a>/g, '');

  // Everything that is not prose.
  s = s.replace(/<script[\s\S]*?<\/script>/g, '');
  s = s.replace(/<style[\s\S]*?<\/style>/g, '');
  s = s.replace(/<svg[\s\S]*?<\/svg>/g, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  // Screen-reader-only text is real content, so it stays.

  // Headings, in order of specificity so h1 does not eat h2.
  for (const level of [6, 5, 4, 3, 2, 1]) {
    const hashes = '#'.repeat(level);
    s = s.replace(new RegExp(`<h${level}[^>]*>([\\s\\S]*?)</h${level}>`, 'g'), `\n\n${hashes} $1\n\n`);
  }

  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, '\n- $1');
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/g, '**$2**');
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/g, '*$2*');
  s = s.replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)');
  s = tables(s);
  s = s.replace(new RegExp(`</(${BLOCK})>`, 'g'), '\n\n');
  s = s.replace(/<br\s*\/?>/g, '\n');
  s = s.replace(/<[^>]+>/g, '');

  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&pound;/g, '£');

  // Tidy the whitespace the tag stripping leaves behind.
  return s
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** The <title> and meta description, which are content a writer owns too. */
function meta(html: string): { title: string; description: string } {
  const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? '';
  const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
  return { title: title.trim(), description: description.trim() };
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (entry.endsWith('.html')) acc.push(full);
  }
  return acc;
}

const urlOf = (file: string): string => {
  const rel = file.slice(outDir.length).replace(/\\/g, '/');
  return rel.replace(/\/index\.html$/, '/').replace(/\.html$/, '') || '/';
};

// ─── Ordering, so the file reads as a site rather than a directory ─────────

const ORDER = [
  '/',
  '/rates',
  '/guidance',
  '/guidance/who-can-get-an-allowance',
  '/guidance/what-your-council-must-consider',
  '/guidance/how-the-means-test-works',
  '/guidance/asking-for-the-policy',
  '/guidance/rates',
  '/guidance/annual-reviews',
  '/guidance/fixed-percentage-policies',
  '/guidance/child-benefit-deduction',
  '/guidance/former-foster-carers',
  '/guidance/enhancements-for-additional-needs',
  '/guidance/benefits-and-your-allowance',
  '/guidance/which-council-is-responsible',
  '/guidance/complaining-to-the-ombudsman',
  '/guidance/turning-18',
  '/guidance/scotland-kinship-care',
  '/guidance/kinship-zones',
  '/about',
  '/contact',
  '/disclaimer',
  '/privacy',
  '/terms',
  '/accessibility',
  '/404',
];

const rank = (url: string): number => {
  const i = ORDER.indexOf(url);
  return i === -1 ? ORDER.length : i;
};

const pages = walk(outDir)
  .map((file) => {
    const html = readFileSync(file, 'utf8');
    return { url: urlOf(file), ...meta(html), body: toMarkdown(html) };
  })
  .sort((a, b) => rank(a.url) - rank(b.url) || a.url.localeCompare(b.url));

const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;
const total = pages.reduce((n, p) => n + words(p.body), 0);

// ─── The file ──────────────────────────────────────────────────────────────

const parts: string[] = [];

parts.push(`# Every word on the site

For the content rewrite. Generated ${new Date().toISOString().slice(0, 10)} from the built
site, so this is what a visitor actually reads, not what the source files contain.

**${pages.length} pages, about ${total.toLocaleString('en-GB')} words.**

## How to use this

Each page below has its URL as the heading. Rewrite underneath it, or in your own
document with the URLs as reference. Keep the heading structure: the h2s and h3s
are how someone skims this on a phone, and several of them are linked to from
elsewhere on the site.

## Who is reading

Mostly grandparents, aged 55 to 75, often on a tablet, usually reading once,
while worried about money and about a child. Reading age target is 12 to 14.
Short sentences. One idea per paragraph.

## The rules that are not style preferences

These come from the legal reviews and they hold whatever the new wording is.

1. **No em dashes.** A build gate fails on one. Commas, full stops, colons and
   brackets cover every case, and the rewrite that removes the dash is almost
   always the clearer sentence.
2. **Never say a council has broken the law.** Say what the guidance and the
   published decisions say, and what the reader can ask for. "Found at fault by
   the Ombudsman" is a fact. "Unlawful" is a finding a court makes.
3. **Never promise an amount.** Financial support is discretionary. There is no
   figure anyone is entitled to. The site shows what a council should be
   starting from.
4. **Regulation 7 is a power, not a protection.** It lets a council keep paying
   the reward element and lets it stop. Never "protected", never "guaranteed".
5. **Do not add a legal claim that is not already here.** Every claim on this
   site is tied to a source, and a build gate checks it. If the rewrite needs a
   new claim, flag it and it will be sourced first.
6. **Keep the caveats.** Where a sentence admits a gap or an assumption, that is
   deliberate. An admitted gap is more useful than an invisible one.

## What is NOT in this file

Only the calculator form itself: the questions, field labels, hints and buttons.
That is interface rather than prose, and it is out of scope for the rewrite.

Everything else a reader can see IS here, including the 34 warnings and the nine
letters, which live in code and appear on no page until a carer's own answers
trigger them. They are at the end.

---
`);

const toc = pages.map((p) => `- [\`${p.url}\`](#${p.url.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}) ${p.title ? `. ${p.title}` : ''}`).join('\n');
parts.push(`## The pages\n\n${toc}\n\n---\n`);

for (const page of pages) {
  parts.push(`\n\n## \`${page.url}\`\n`);
  if (page.title) parts.push(`**Browser tab title:** ${page.title}\n`);
  if (page.description) parts.push(`**Search result description:** ${page.description}\n`);
  parts.push(`**Length:** about ${words(page.body).toLocaleString('en-GB')} words\n`);
  parts.push(`\n---\n\n${page.body}\n`);
}

// ─── The copy that lives in TypeScript ─────────────────────────────────────
//
// A warning only appears when its trigger fires, and a letter only when the
// result offers it, so neither is on any built page in full. They are copy all
// the same, and leaving them out is how the reg 7 wording survived two rewrites.

const { FLAG_CATALOGUE, makeFlag } = await import('../packages/engine/src/index.js');
const { LETTER_TEMPLATES, generateLetter } = await import('../packages/letters/src/index.js');

const SEVERITY_ORDER = ['critical', 'important', 'info'] as const;
const codes = Object.keys(FLAG_CATALOGUE) as Array<keyof typeof FLAG_CATALOGUE>;

parts.push(`\n\n---\n\n# The warnings shown on a result\n
${codes.length} of them. A carer sees only the ones their own answers trigger, usually
three to eight. They are the reason people share this site: the warning is often
worth more than the number.

**These carry the most legal weight of anything here.** Every one was reviewed on
1 and 2 September 2026, and several are worded the way they are to survive a
council lawyer reading them. Rewrite for clarity, not for strength.

The example text below is filled with placeholder values where a warning takes
them, so you can see the shape of the sentence.
`);

for (const severity of SEVERITY_ORDER) {
  const inGroup = codes.filter((c) => FLAG_CATALOGUE[c].severity === severity);
  parts.push(`\n## ${severity} (${inGroup.length})\n`);
  for (const code of inGroup) {
    const flag = makeFlag(code, {
      councilName: '[COUNCIL]',
      coreWeekly: 20000 as never,
      nationalWeekly: 22700 as never,
      ageBand: '11-15',
      previousWeekly: 30000 as never,
      monthsSinceOrder: 18,
      taperMethod: 'pound-for-pound',
      savingsCapital: 700000 as never,
      effectiveTo: '2027-03-31',
      livingCostsPercent: 100,
      modelLivingCostsPercent: 125,
      policySummary: '[WHAT THE FINDING SAID]',
      policySourceUrl: '[LINK]',
      decisionDate: '[DATE]',
      policyCheckedOn: '[DATE]',
    });
    parts.push(`\n### ${flag.title}\n`);
    parts.push(`_Code \`${code}\`${flag.citation ? `, source: ${flag.citation.label}` : ''}_\n`);
    parts.push(`${flag.body}\n`);
  }
}

parts.push(`\n\n---\n\n# The nine letters\n
Sent by a carer to their council, pre-filled with their own figures. They go to a
social worker the carer will deal with for years, so they are polite, short and
specific, and they always request rather than demand.

**Reviewed by a solicitor on 1 and 2 September 2026.** Several sentences are
precisely worded to avoid handing a council an easy correction. Flag anything you
want to change rather than changing it.
`);

const letterCtx = {
  councilName: '[COUNCIL]',
  childAgeBand: '11-15',
  region: 'south-east' as const,
  nmaWeekly: 25500 as never,
  currentlyPaidWeekly: 20000 as never,
  onMeansTestedBenefits: true,
  wasFosterCarer: true,
  orderDate: '[DATE]' as never,
  flagsRaised: [],
};

for (const template of Object.keys(LETTER_TEMPLATES) as Array<keyof typeof LETTER_TEMPLATES>) {
  const letter = generateLetter(template, letterCtx);
  parts.push(`\n## ${LETTER_TEMPLATES[template].title}\n`);
  parts.push(`_Template \`${template}\`_\n`);
  parts.push(`**Subject:** ${letter.subject}\n`);
  parts.push('```\n' + letter.body + '\n```\n');
}

writeFileSync(outFile, parts.join('\n'));
console.log(
  `export-writer-pack: ${pages.length} pages, ${total.toLocaleString('en-GB')} words into ${outFile}`,
);
