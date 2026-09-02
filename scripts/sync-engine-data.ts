/**
 * Copy /data/*.json into packages/engine/src/data/ so the pure engine can import
 * it as modules while /data remains the single versioned source of truth [R10].
 *
 * The copies are gitignored. Run before build, typecheck and test.
 *
 * The copy is not byte-for-byte. /data carries a lot of prose that exists for
 * whoever maintains it — why a figure is held back, what corroborates an odd
 * one, which of two April dates we followed and why. None of it is ever
 * rendered, and all of it was being downloaded by every carer who opened the
 * calculator, many of them on a phone on a bad connection. So the shipped copy
 * is stripped of it.
 *
 * The direction matters: /data keeps everything, which is what validate-data
 * reads, so the gates that insist on a verifyNote or a pendingSourceIssue still
 * bite. Only the browser's copy is slimmer. Documenting a decision therefore
 * costs nothing at runtime, which is the point — the alternative is a quiet
 * pressure to explain less.
 */
import { readFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'data');
const dest = join(root, 'packages', 'engine', 'src', 'data');

/**
 * Keys that exist only for maintainers. Verified against the rendering code:
 * of the citation fields only `holding` reaches a user, and `note` never does.
 *
 * `userFacingNote` is deliberately NOT here — it is the opposite of this list.
 */
const MAINTAINER_ONLY_KEYS = new Set([
  'note',
  'verifyNote',
  'verificationNote',
  'aprilBoundaryNote',
  'anomalyCorroboration',
  'sourcedButUnused',
  'knownDiscrepancies',
  'lawfulnessNote',
  'publishableNote',
  'schemaNote',
  'fixedPercentageNote',
  'pendingLawfulnessFlag',
  'tariffAsPrinted',
]);

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (MAINTAINER_ONLY_KEYS.has(k)) continue;
    out[k] = strip(v);
  }
  return out;
}

/**
 * `holding` is the one-line statement of what a source decided, and it is shown
 * to a carer under "Where these figures and rules come from". It is only ever
 * shown for a citation something actually points at. Citations we hold for the
 * record, so that a later question has an answer, are never rendered, so their
 * holding is prose nobody downloads for a reason.
 *
 * The entries themselves are kept, so `cite()` can never throw on an id that
 * exists in /data. Only the prose goes. Every id used in code is a literal, and
 * this scan reads the same four places validate-data checks, so a referenced
 * citation cannot lose its holding by accident.
 */
function referencedCitationIds(): Set<string> {
  const out = new Set<string>();
  const roots = [
    join(root, 'packages', 'engine', 'src'),
    join(root, 'packages', 'letters', 'src'),
    join(root, 'apps', 'web', 'content'),
    join(root, 'apps', 'web', 'app'),
    join(root, 'apps', 'web', 'components'),
  ];
  const scan = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'data') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
        continue;
      }
      if (!/\.(tsx?|mdx)$/.test(entry.name)) continue;
      const text = readFileSync(full, 'utf8');
      // Both quote styles: TypeScript writes 'an-id', MDX writes id="an-id".
      for (const m of text.matchAll(/['"]([a-z0-9][a-z0-9-]{3,})['"]/g)) out.add(m[1]!);
      for (const m of text.matchAll(/citations:\s*\[([^\]]*)\]/g)) {
        for (const id of m[1]!.split(',')) out.add(id.trim().replace(/^['"]|['"]$/g, ''));
      }
    }
  };
  for (const r of roots) scan(r);
  // sourceId in the data itself, which is how rate tables name their source.
  for (const f of readdirSync(src).filter((f) => f.endsWith('.json'))) {
    const raw = readFileSync(join(src, f), 'utf8');
    for (const m of raw.matchAll(/"(?:sourceId|citationIds?)":\s*"([^"]+)"/g)) out.add(m[1]!);
    for (const m of raw.matchAll(/"citationIds":\s*\[([^\]]*)\]/g)) {
      for (const id of m[1]!.split(',')) out.add(id.trim().replace(/^"|"$/g, ''));
    }
  }
  return out;
}

const referenced = referencedCitationIds();

/**
 * The broad scan above is deliberately generous. This is the narrow one: the
 * two places a citation is named in order to be RENDERED. If either ever names
 * an id the broad scan missed, a carer would open a result and find a source
 * with no statement of what it decided. Fail the sync rather than ship that.
 */
function strictlyRenderedCitationIds(): string[] {
  const out = new Set<string>();
  // flagCatalogue.ts holds the citationIds now. Reading flags.ts would find
  // none, and every citation a warning renders would be stripped as unused.
  const flagsSrc = readFileSync(
    join(root, 'packages', 'engine', 'src', 'flagCatalogue.ts'),
    'utf8',
  );
  for (const m of flagsSrc.matchAll(/citationId:\s*['"]([^'"]+)['"]/g)) out.add(m[1]!);
  const contentDir = join(root, 'apps', 'web', 'content');
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.mdx')) {
        const text = readFileSync(full, 'utf8');
        for (const m of text.matchAll(/citations:\s*\[([^\]]*)\]/g)) {
          for (const id of m[1]!.split(',')) {
            const clean = id.trim().replace(/^['"]|['"]$/g, '');
            if (clean) out.add(clean);
          }
        }
        for (const m of text.matchAll(/<Source\s+id=['"]([^'"]+)['"]/g)) out.add(m[1]!);
      }
    }
  };
  walk(contentDir);
  return [...out];
}

const missed = strictlyRenderedCitationIds().filter((id) => !referenced.has(id));
if (missed.length > 0) {
  console.error(
    'sync-engine-data: these citations are rendered to carers but the reference scan did not ' +
      `find them, so their holdings would be stripped: ${missed.join(', ')}`,
  );
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

/**
 * Files the browser never reads. The watch list is a note to ourselves about
 * documents we are still chasing; shipping it would put kilobytes of internal
 * prose into every page load for no reader's benefit.
 */
const MAINTAINER_ONLY_FILES = new Set(['watchlist.json']);

const files = readdirSync(src)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !MAINTAINER_ONLY_FILES.has(f));
let before = 0;
let after = 0;

let holdingsDropped = 0;

for (const f of files) {
  const raw = readFileSync(join(src, f), 'utf8');
  const doc = strip(JSON.parse(raw)) as Record<string, Record<string, unknown>>;
  if (f === 'citations.json') {
    for (const [id, entry] of Object.entries(doc)) {
      if (!referenced.has(id) && entry.holding !== undefined) {
        delete entry.holding;
        holdingsDropped += 1;
      }
    }
  }
  const slim = `${JSON.stringify(doc)}\n`;
  before += Buffer.byteLength(raw);
  after += Buffer.byteLength(slim);
  writeFileSync(join(dest, f), slim);
}

const saved = (((before - after) / before) * 100).toFixed(0);
console.log(
  `sync-engine-data: copied ${files.length} data files into packages/engine/src/data ` +
    `(${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB, ${saved}% of it maintainer prose and formatting; ` +
    `${holdingsDropped} citation holdings dropped as never rendered)`,
);
