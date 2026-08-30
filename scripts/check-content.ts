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

import { readFileSync, readdirSync, existsSync } from 'node:fs';
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
