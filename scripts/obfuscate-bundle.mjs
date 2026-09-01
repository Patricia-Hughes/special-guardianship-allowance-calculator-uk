/**
 * Obfuscate the one shipped file that contains our own code.
 *
 * Everything a browser runs, a visitor can read: that is how browsers work, and
 * no setting changes it. What this does is make a copy unrewarding. The rate
 * tables, the warning wording and the engine stop being greppable, so somebody
 * who lifts the file gets something that runs but that they cannot search,
 * read or update. It is a lock on a garden gate. It stops the opportunist.
 *
 * Three deliberate limits:
 *
 *  1. **Only our chunk.** React and Next.js are public open source, so
 *     obfuscating them would cost a carer bytes and protect nothing. The file
 *     is found by looking for our own markers rather than by name, because
 *     Next.js hashes the filename on every build.
 *
 *  2. **No eval, no self-defending traps.** Our Content-Security-Policy
 *     forbids eval, and a "protection" that only works by breaking the page
 *     for people who open dev tools is hostile to the wrong audience. The
 *     heavier settings also cost 8x the bytes, which on a poor mobile
 *     connection is five seconds of a grandparent's time to slow down a thief
 *     by an hour. Measured, not assumed: see the baseline in this repo.
 *
 *  3. **It does not touch the guidance pages.** Those are HTML, their text has
 *     to be readable, and we want search engines to read it. Anyone can view
 *     source on them. That is the deal with published guidance and it is not
 *     something to pretend otherwise about.
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Resolved from apps/web, which is where the dependency belongs: this is a
// step in the web build, not a repo-wide tool.
const require = createRequire(join(root, 'apps', 'web', 'package.json'));
const chunks = join(root, 'apps', 'web', 'out', '_next', 'static', 'chunks');

/** Strings that only appear in code we wrote. */
const OURS = ['rest-of-england', 'sg-regs-2005', 'LGSCO_UPHELD', 'unjustified departure'];

const OPTIONS = {
  compact: true,
  // The string array is what hides the copy and the rate figures. Base64
  // rather than rc4: same effect on a Ctrl+F, without the decode cost on
  // every string at runtime.
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 1,
  splitStrings: true,
  splitStringsChunkLength: 8,
  // Without this, object KEYS survive: our rate tables are shaped
  // { "rest-of-england": { "0-2": 20500 } }, and a string array leaves the keys
  // alone. The verification at the bottom of this file caught that, which is
  // why it is there: an obfuscation step that quietly does half the job is
  // worse than none, because you stop looking.
  transformObjectKeys: true,
  identifierNamesGenerator: 'mangled',
  // Everything below is off on purpose. See limit 2 above.
  controlFlowFlattening: false,
  deadCodeInjection: false,
  selfDefending: false,
  debugProtection: false,
  // Fixed, so two builds of the same source produce the same file.
  seed: 20260901,
};

function jsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...jsFiles(full));
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const files = jsFiles(chunks);
const targets = files.filter((f) => {
  const text = readFileSync(f, 'utf8');
  return OURS.some((m) => text.includes(m));
});

if (targets.length === 0) {
  console.error(
    'obfuscate-bundle: found no chunk containing our own code, out of ' +
      `${files.length} shipped. Either the build changed shape or this ran twice. ` +
      'Failing rather than shipping unobfuscated and saying otherwise.',
  );
  process.exit(1);
}

const { obfuscate } = require('javascript-obfuscator');
let before = 0;
let after = 0;

for (const file of targets) {
  const src = readFileSync(file, 'utf8');
  const result = obfuscate(src, OPTIONS).getObfuscatedCode();
  writeFileSync(file, result);
  before += gzipSync(Buffer.from(src)).length;
  after += gzipSync(Buffer.from(result)).length;

  // Prove it worked rather than assuming it did.
  const still = OURS.filter((m) => result.includes(m));
  if (still.length > 0) {
    console.error(
      `obfuscate-bundle: ${relative(root, file)} still contains ${still.join(', ')} in plain text.`,
    );
    process.exit(1);
  }
}

console.log(
  `obfuscate-bundle: ${targets.length} of ${files.length} chunks obfuscated ` +
    `(${kb(before)} -> ${kb(after)} gzipped, +${Math.round((after / before - 1) * 100)}%). ` +
    'React and Next.js left alone; guidance pages are HTML and stay readable.',
);
