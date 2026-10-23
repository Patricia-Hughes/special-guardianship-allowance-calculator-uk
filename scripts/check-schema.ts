/**
 * Structured data gate — spec §27.
 *
 * Runs against the BUILT HTML, not the source, because what matters is the graph
 * a crawler actually receives.
 *
 * The rule this exists for is the dangling reference. A graph whose nodes point
 * at `@id`s that nothing defines looks correct in review and is worth nothing:
 * the crawler cannot resolve the author of a guide to the person the About page
 * describes, which was the entire state of this site before the rewrite. It is
 * invisible in the source and only shows up if something checks the output.
 *
 * Resolution is SITE-WIDE, not per page, because that is what an `@id` means. A
 * guide referring to the About page's node, or the guides index referring to
 * sixteen Article nodes it does not itself contain, is correct linked data. What
 * is not correct is an id nothing anywhere defines, which is a typo or a rename
 * that got half-applied.
 *
 * It also holds two decisions that were argued out and would otherwise rot:
 * nothing on this site is an Organization, and nothing claims a professional
 * credential. Both contradict what the pages say in plain English.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, type DefaultTreeAdapterMap } from 'parse5';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'apps', 'web', 'out');

const failures: string[] = [];

/** Pages that legitimately carry no structured data. */
const NO_SCHEMA = new Set(['404.html']);

function htmlFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_next') continue;
      htmlFiles(full, acc);
    } else if (entry.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

/** Read script text as an HTML parser does, including multiline closing tags. */
function structuredDataBlocks(html: string): string[] {
  const blocks: string[] = [];
  function visit(node: DefaultTreeAdapterMap['node']): void {
    if ('tagName' in node && node.tagName === 'script' &&
        node.attrs.some((attr) => attr.name === 'type' && attr.value === 'application/ld+json')) {
      blocks.push(node.childNodes.map((child) => 'value' in child ? child.value : '').join(''));
    }
    if ('childNodes' in node) node.childNodes.forEach(visit);
  }
  visit(parse(html));
  return blocks;
}

/** Every node in a graph, including nested ones. */
function walk(value: unknown, fn: (node: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const v of value) walk(v, fn);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const node = value as Record<string, unknown>;
  fn(node);
  for (const v of Object.values(node)) walk(v, fn);
}

if (!statSync(outDir, { throwIfNoEntry: false })) {
  console.error('check-schema: apps/web/out does not exist. Run the build first.');
  process.exit(1);
}

let pagesWithGraph = 0;
const typesSeen = new Set<string>();

/** Every `@id` this site defines anywhere, and every reference to be resolved. */
const definedSiteWide = new Set<string>();
const references: Array<{ rel: string; id: string }> = [];

for (const file of htmlFiles(outDir)) {
  const rel = relative(outDir, file);
  const html = readFileSync(file, 'utf8');
  const blocks = structuredDataBlocks(html);

  if (blocks.length === 0) {
    if (!NO_SCHEMA.has(rel)) {
      failures.push(`${rel}: no structured data. Every page but the 404 carries a graph.`);
    }
    continue;
  }
  pagesWithGraph += 1;

  for (const raw of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      failures.push(`${rel}: structured data is not valid JSON. ${String(e)}`);
      continue;
    }

    // ── Collect what this graph defines, and what it points at ─────────────
    walk(parsed, (node) => {
      const id = node['@id'];
      if (typeof id !== 'string') return;
      // A node carrying an @type DEFINES that id. A bare {"@id": x} only
      // REFERENCES it. That distinction is the whole check.
      if ('@type' in node) definedSiteWide.add(id);
      else if (Object.keys(node).length === 1) references.push({ rel, id });
    });

    // ── Every node is typed, and the settled decisions hold ────────────────
    walk(parsed, (node) => {
      const type = node['@type'];
      if (typeof type === 'string') typesSeen.add(type);

      if ('@id' in node && !('@type' in node) && Object.keys(node).length > 1) {
        failures.push(`${rel}: node "${String(node['@id'])}" has properties but no @type.`);
      }

      for (const banned of ['aggregateRating', 'review', 'hasCredential', 'jobTitle'] as const) {
        if (banned in node) {
          failures.push(
            `${rel}: uses "${banned}".\n` +
              '      There are no reviews of this site and its author claims no professional\n' +
              '      standing. The pages say so in plain English; the markup must not disagree.',
          );
        }
      }

      // privacyPolicy is an Organization property. This site has no Organization
      // by design, so the property has nowhere valid to sit and a validator
      // rejects it wherever it is put. It shipped on WebSite for one release
      // because it looked harmless and nobody checked the domain.
      if ('privacyPolicy' in node) {
        failures.push(
          `${rel}: uses "privacyPolicy" on ${String(node['@type'])}.\n` +
            '      It belongs to Organization, which this site does not have. Link the privacy\n' +
            '      page from the footer, which is where a reader looks for it anyway.',
        );
      }

      for (const role of ['publisher', 'author', 'creator'] as const) {
        const v = node[role];
        if (v && typeof v === 'object' && (v as Record<string, unknown>)['@type'] === 'Organization') {
          failures.push(
            `${rel}: names an Organization as ${role}.\n` +
              '      This site is one person, and the disclaimer says so on three pages.',
          );
        }
      }
    });
  }
}

for (const { rel, id } of references) {
  if (!definedSiteWide.has(id)) {
    failures.push(
      `${rel}: points at "${id}", which nothing on the site defines.\n` +
        '      A reference nothing resolves is the same as no reference at all. Either the\n' +
        '      node was renamed and this was missed, or the id is a typo.',
    );
  }
}

if (failures.length > 0) {
  console.error(`\ncheck-schema: ${failures.length} failure(s)\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log(
  `check-schema: ${pagesWithGraph} pages carry a connected graph, ` +
    `${typesSeen.size} distinct types, ${definedSiteWide.size} identified entities, ` +
    `all ${references.length} @id references resolve.`,
);
