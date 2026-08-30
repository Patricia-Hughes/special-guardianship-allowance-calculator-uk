/**
 * Copy /data/*.json into packages/engine/src/data/ so the pure engine can import
 * it as modules while /data remains the single versioned source of truth [R10].
 *
 * The copies are gitignored. Run before build, typecheck and test.
 */
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'data');
const dest = join(root, 'packages', 'engine', 'src', 'data');

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

const files = readdirSync(src).filter((f) => f.endsWith('.json'));
for (const f of files) cpSync(join(src, f), join(dest, f));

console.log(`sync-engine-data: copied ${files.length} data files into packages/engine/src/data`);
