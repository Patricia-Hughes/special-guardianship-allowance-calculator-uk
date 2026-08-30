/**
 * Citation link health — spec §9.
 *
 * HEAD every citation URL. Report 404s. WARN, don't fail — gov sites move, and
 * a moved link must not block a deploy that fixes something else.
 *
 * Run weekly on a schedule, not on every commit (§36).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

interface Citation {
  label: string;
  url: string;
  kind: string;
  retrieved: string;
  pendingSourceIssue?: string;
}

const citations = JSON.parse(
  readFileSync(join(root, 'data', 'citations.json'), 'utf8'),
) as Record<string, Citation>;

const TIMEOUT_MS = 15_000;

async function head(url: string): Promise<{ ok: boolean; status: number | string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    // Some gov sites reject HEAD outright; fall back to a ranged GET.
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { Range: 'bytes=0-0' },
      });
    }
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: e instanceof Error ? e.name : 'error' };
  } finally {
    clearTimeout(timer);
  }
}

const missing: string[] = [];
const broken: string[] = [];
const ok: string[] = [];

const entries = Object.entries(citations);
const results = await Promise.all(
  entries.map(async ([id, c]) => {
    if (!c.url) return { id, c, result: null };
    return { id, c, result: await head(c.url) };
  }),
);

for (const { id, c, result } of results) {
  if (result === null) {
    missing.push(
      `${id} (${c.label}) has no URL yet${c.pendingSourceIssue ? ` — tracked at ${c.pendingSourceIssue}` : ''}`,
    );
    continue;
  }
  if (result.ok) ok.push(id);
  else broken.push(`${id} → ${c.url} returned ${result.status}`);
}

console.log(`check-citations: ${ok.length} live, ${broken.length} broken, ${missing.length} not yet sourced.\n`);

if (broken.length > 0) {
  console.warn('Broken links (warn only — update or archive them):');
  for (const b of broken) console.warn(`  ⚠ ${b}`);
  console.warn('');
}
if (missing.length > 0) {
  console.warn('Citations still awaiting a source URL:');
  for (const m of missing) console.warn(`  ⚠ ${m}`);
  console.warn('');
  console.warn(
    'Every legal claim needs a live URL before the page making it ships (spec §40, R9).',
  );
}
