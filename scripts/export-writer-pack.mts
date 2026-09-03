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
function toMarkdown(html: string): string {
  let s = html;

  // The head. Its <title> is captured separately as metadata, and left in the
  // body it renders as a stray bullet at the top of every page.
  s = s.replace(/[\s\S]*?<body[^>]*>/, '');

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
  s = s.replace(/<th[^>]*>([\s\S]*?)<\/th>/g, '| $1 ');
  s = s.replace(/<td[^>]*>([\s\S]*?)<\/td>/g, '| $1 ');
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

The nine template letters and the 34 warnings shown on a result. They are copy
too, and they were reviewed on 1 and 2 September, so they are in the separate
review pack rather than here. Ask if you want them in scope as well.

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

writeFileSync(outFile, parts.join('\n'));
console.log(
  `export-writer-pack: ${pages.length} pages, ${total.toLocaleString('en-GB')} words into ${outFile}`,
);
