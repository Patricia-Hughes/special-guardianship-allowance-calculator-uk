/**
 * Content gates — spec §26 and §36.
 *
 *   FAIL on a £ followed by digits in MDX body content, with an allowlist for
 *        genuine historic references and worked examples.
 *   FAIL on frontmatter that is missing or malformed.
 *   WARN on a page overdue for review (lastReviewed + reviewEvery).
 *
 * Why the money check is a build failure and not a lint warning: a writer who
 * types "£255" into prose ships a figure that is correct until 1 April and
 * silently wrong afterwards. <RateTable /> and the engine read the versioned
 * data, so they update everywhere at once. There is no good reason for a rate to
 * appear as literal text.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = join(root, 'apps', 'web', 'content');

const failures: string[] = [];
const warnings: string[] = [];

const REQUIRED_FRONTMATTER = [
  'title',
  'slug',
  'description',
  'lastUpdated',
  'lastReviewed',
  'reviewEvery',
  'citations',
] as const;

const citations = JSON.parse(
  readFileSync(join(root, 'data', 'citations.json'), 'utf8'),
) as Record<string, unknown>;

const MONEY_LITERAL = /£\s?\d/;

function durationToDays(iso: string): number {
  const m = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/.exec(iso);
  if (!m) return NaN;
  const [, y = '0', mo = '0', d = '0'] = m;
  return Number(y) * 365 + Number(mo) * 30 + Number(d);
}

const today = new Date(process.env.SGO_TODAY ?? new Date().toISOString().slice(0, 10));

for (const kind of ['guidance', 'la'] as const) {
  const dir = join(contentRoot, kind);
  if (!existsSync(dir)) continue;

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.mdx'))) {
    const path = join(dir, file);
    const rel = `content/${kind}/${file}`;
    const parsed = matter(readFileSync(path, 'utf8'));
    const fm = parsed.data as Record<string, unknown>;

    // ── Frontmatter ────────────────────────────────────────────────────────
    for (const key of REQUIRED_FRONTMATTER) {
      if (fm[key] === undefined || fm[key] === '') {
        failures.push(`${rel}: frontmatter is missing "${key}"`);
      }
    }
    if (fm.slug !== file.replace(/\.mdx$/, '')) {
      failures.push(`${rel}: frontmatter slug "${String(fm.slug)}" does not match the filename`);
    }
    for (const id of (fm.citations as string[] | undefined) ?? []) {
      if (!(id in citations)) {
        failures.push(`${rel}: cites "${id}", which is not in citations.json`);
      }
    }

    // ── Review dates ───────────────────────────────────────────────────────
    const reviewEvery = String(fm.reviewEvery ?? '');
    const dueDays = durationToDays(reviewEvery);
    if (Number.isNaN(dueDays)) {
      failures.push(`${rel}: reviewEvery "${reviewEvery}" is not an ISO 8601 duration like P6M`);
    } else {
      const reviewed = Date.parse(`${String(fm.lastReviewed)}T00:00:00Z`);
      if (Number.isNaN(reviewed)) {
        failures.push(`${rel}: lastReviewed "${String(fm.lastReviewed)}" is not a date`);
      } else {
        const ageDays = (today.getTime() - reviewed) / 86_400_000;
        if (ageDays > dueDays) {
          warnings.push(
            `${rel} is overdue for review: last reviewed ${String(fm.lastReviewed)}, ` +
              `review interval ${reviewEvery} (${Math.round(ageDays - dueDays)} days over).`,
          );
        }
      }
    }

    // ── Literal money in body content ──────────────────────────────────────
    const allowed = new Set(((fm.literalMoneyAllowed as string[] | undefined) ?? []).map(String));
    const lines = parsed.content.split('\n');
    lines.forEach((line, i) => {
      if (!MONEY_LITERAL.test(line)) return;
      const trimmed = line.trim();
      if (allowed.has(trimmed)) return;
      failures.push(
        `${rel}:${i + 2}: literal money in body content — "${trimmed.slice(0, 80)}"\n` +
          '      Use <RateTable /> so it updates with the data every April. If this is a worked\n' +
          '      example or a historic figure that must not change, add the exact line to the\n' +
          '      frontmatter\'s literalMoneyAllowed array with that justification.',
      );
    });
  }
}

// ── No em dashes in anything a carer reads ──────────────────────────────────
// A house style rule, not a typographic preference. Em dashes are the single
// clearest tell of machine-written prose, and this site is asking people to
// trust it with a decision about money. It should read as though a person wrote
// it. Commas, full stops, colons and brackets cover every case; the rewrite
// that removes the dash is almost always the clearer sentence anyway.
//
// Code comments are exempt: nobody reads them but us.
const EM_DASH_ROOTS = [
  join(root, 'apps', 'web', 'content'),
  join(root, 'apps', 'web', 'app'),
  join(root, 'apps', 'web', 'components'),
  join(root, 'packages', 'engine', 'src', 'flags.ts'),
  // Validation messages are read by users too, and were missed the first time.
  join(root, 'packages', 'engine', 'src', 'schema.ts'),
  join(root, 'packages', 'letters', 'src'),
];

function isComment(line: string): boolean {
  return /^\s*(\/\/|\/\*|\*)/.test(line);
}

function walkFiles(target: string, acc: string[] = []): string[] {
  if (!existsSync(target)) return acc;
  if (statSync(target).isFile()) {
    acc.push(target);
    return acc;
  }
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') {
      continue;
    }
    const full = join(target, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else if (/\.(tsx?|mdx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

for (const target of EM_DASH_ROOTS) {
  for (const file of walkFiles(target)) {
    const rel = file.slice(root.length + 1);
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (!line.includes('—') || isComment(line)) return;
        failures.push(
          `${rel}:${i + 1}: em dash in text a user reads\n` +
            `      ${line.trim().slice(0, 90)}\n` +
            '      Rewrite it. A comma, a full stop, a colon or brackets will do the job, and\n' +
            '      usually make the sentence plainer.',
        );
      });
  }
}

for (const w of warnings) console.warn(`  ⚠ ${w}`);

if (failures.length > 0) {
  console.error(`\ncheck-content: ${failures.length} failure(s)\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log(
  warnings.length > 0
    ? `\ncheck-content: passed with ${warnings.length} page(s) overdue for review.`
    : 'check-content: all content checks passed.',
);
