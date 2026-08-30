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

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

const files = readdirSync(src).filter((f) => f.endsWith('.json'));
let before = 0;
let after = 0;

for (const f of files) {
  const raw = readFileSync(join(src, f), 'utf8');
  const slim = `${JSON.stringify(strip(JSON.parse(raw)))}\n`;
  before += Buffer.byteLength(raw);
  after += Buffer.byteLength(slim);
  writeFileSync(join(dest, f), slim);
}

const saved = (((before - after) / before) * 100).toFixed(0);
console.log(
  `sync-engine-data: copied ${files.length} data files into packages/engine/src/data ` +
    `(${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB, ${saved}% of it maintainer prose and formatting)`,
);
