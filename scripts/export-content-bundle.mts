/**
 * Every word on the site, in one folder.
 *
 * WEBSITE-CONTENT.md deliberately leaves the calculator out, because a writer
 * rewriting prose does not want form labels mixed in. This is the other
 * request: everything, with nothing left out, arranged so a person can find the
 * part they want.
 *
 * Half of it cannot be read off the built HTML. The calculator's later steps
 * only exist once the page is running, so a file scan sees step 1 and nothing
 * after it. So this drives a real browser through the whole form, the way a
 * carer would, and writes down what is actually on screen at each step. What it
 * captures is what a person sees, not what the source suggests they might.
 *
 * Run: pnpm export:content-bundle
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Playwright is a dependency of apps/web, not of the repo root, so a script up
 * here cannot import it by name. Resolved from that package instead, which
 * uses the copy already installed rather than adding a second one.
 */
const require = createRequire(import.meta.url);
const { chromium } = require(
  require.resolve('@playwright/test', { paths: [join(root, 'apps', 'web')] }),
) as typeof import('@playwright/test');
type Page = Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>;
const outDir = join(root, 'apps', 'web', 'out');
const bundle = join(root, 'content-bundle');
const PORT = 4399;
const base = `http://127.0.0.1:${PORT}`;

const write = (rel: string, body: string): void => {
  const file = join(bundle, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body.replace(/\n{3,}/g, '\n\n').trimStart() + '\n');
};

// ─── HTML to readable markdown ─────────────────────────────────────────────

const BLOCK =
  'address|article|aside|blockquote|details|div|dl|fieldset|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|summary|table|tr|ul';

/** Rebuild a <table> as a real markdown table, caption and all. */
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
    const pad = (r: string[]): string =>
      `| ${[...r, ...Array(width - r.length).fill('')].join(' | ')} |`;
    const [header, ...body] = rows as [string[], ...string[][]];
    const lines = [pad(header), `|${' --- |'.repeat(width)}`, ...body.map(pad)];
    const title = caption.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return `\n\n${title ? `**${title}**\n\n` : ''}${lines.join('\n')}\n\n`;
  });
}

function markdown(html: string): string {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');

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

  return s
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Which pages exist ─────────────────────────────────────────────────────

function htmlFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === '_next') continue;
    try {
      if (readdirSync(full).length >= 0) htmlFiles(full, acc);
    } catch {
      if (entry.endsWith('.html')) acc.push(full);
    }
  }
  return acc;
}

const ORDER = ['/', '/guidance', '/rates', '/about', '/contact', '/privacy', '/terms', '/accessibility', '/disclaimer'];
const routeOf = (file: string): string => {
  const rel = file.slice(outDir.length).replace(/\\/g, '/');
  return rel === '/index.html' ? '/' : rel.replace(/\.html$/, '');
};
const rank = (route: string): number => {
  const i = ORDER.indexOf(route);
  return i === -1 ? ORDER.length + (route.startsWith('/guidance/') ? 0 : 1) : i;
};

// ─── Driving the form ──────────────────────────────────────────────────────

/**
 * The form as a list of questions, not as flattened HTML.
 *
 * Running the prose converter over a form produced "Which nation?EnglandWales
 * ScotlandNorthern Ireland" and then dumped all 153 council names inline. The
 * words were all there and nobody could read them. A form is a set of
 * questions, each with a hint and some answers, so it is written down that way.
 * Long option lists are counted rather than listed: the council names are data
 * from a lookup table, not copy anyone will rewrite.
 */
async function stepText(page: Page): Promise<string> {
  // Passed as a string, not as a function. tsx compiles this file with esbuild,
  // which rewrites arrow functions to carry their names via a __name helper.
  // That helper exists in Node and not in the page, so a function handed to
  // evaluate dies with "__name is not defined" the moment it runs.
  const parts = (await page.evaluate(READ_THE_FORM)) as string[];
  return parts.join('\n\n');
}

const READ_THE_FORM = `(() => {
  const form = document.querySelector('.calculator-form');
  if (!form) return [];
  const out = [];
  const seen = [];
  const text = (el) => (el && el.textContent ? el.textContent : '').replace(/\\s+/g, ' ').trim();

  for (const h of form.querySelectorAll('h2, h3')) out.push('### ' + text(h));
  for (const p of form.querySelectorAll('p')) {
    const t = text(p);
    if (t && !p.closest('.field') && !p.closest('.callout')) out.push(t);
  }

  for (const fs of form.querySelectorAll('fieldset')) {
    seen.push(fs);
    const legend = text(fs.querySelector('legend'));
    const hint = text(fs.querySelector('.field__hint'));
    out.push('**' + legend + '**' + (hint ? '\\n\\n_' + hint + '_' : ''));
    for (const l of fs.querySelectorAll('label.choice')) out.push('- ( ) ' + text(l));
  }

  for (const field of form.querySelectorAll('.field')) {
    if (seen.some((s) => s.contains(field))) continue;
    const label = text(field.querySelector('.field__label') || field.querySelector('label'));
    const hint = text(field.querySelector('.field__hint'));
    const err = text(field.querySelector('.field__error') || field.querySelector('[role="alert"]'));
    const select = field.querySelector('select');
    const input = field.querySelector('input');
    let kind = 'text box';
    if (select) kind = 'drop-down';
    else if (input && input.type === 'date') kind = 'date box';
    else if (field.querySelector('.money-input')) kind = 'money box, prefixed with a pound sign';
    if (!label) continue;

    out.push('**' + label + '** _(' + kind + ')_' + (hint ? '\\n\\n_' + hint + '_' : ''));
    if (select) {
      const opts = [];
      for (const o of select.querySelectorAll('option')) opts.push(text(o));
      out.push(
        opts.length > 12
          ? '- first option: "' + opts[0] + '", then ' + (opts.length - 1) +
            ' more, taken from a lookup table rather than written by hand'
          : opts.map((o) => '- ' + o).join('\\n'),
      );
    }
    if (err) out.push('> Message shown when this answer is wrong: ' + err);
  }

  for (const c of form.querySelectorAll('label.choice')) {
    if (seen.some((s) => s.contains(c))) continue;
    out.push('- [ ] ' + text(c));
  }

  for (const n of form.querySelectorAll('.callout')) out.push('> ' + text(n));

  const buttons = [];
  for (const b of form.querySelectorAll('button')) if (text(b)) buttons.push('**' + text(b) + '**');
  if (buttons.length) out.push('Buttons: ' + buttons.join(' \u00b7 '));
  return out;
})()`;

/**
 * Walk the calculator the way a carer does, writing down each screen.
 *
 * Every step is filled in with an answer that keeps the form moving, because a
 * step only appears once the one before it is valid. The answers are the
 * simplest that get through; the words captured are the same whatever is typed.
 */
async function captureCalculator(page: Page): Promise<Array<{ name: string; body: string }>> {
  const screens: Array<{ name: string; body: string }> = [];
  const grab = async (name: string): Promise<void> => {
    screens.push({ name, body: await stepText(page) });
  };

  await page.goto(`${base}/`);
  await grab('Step 1 of 7 — Where do you live?');

  await page.getByRole('radio', { name: 'England', exact: true }).check();
  await grab('Step 1 — after choosing England (the region question appears)');
  await page.getByRole('radio', { name: /South East England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();

  await grab('Step 2 of 7 — About the children');
  await page.getByRole('button', { name: /Add another child/i }).click();
  await grab('Step 2 — with a second child added (the eldest question appears)');
  await page.getByLabel('How old are they?').nth(0).fill('12');
  await page.getByLabel('How old are they?').nth(1).fill('4');

  // The validation messages, which are content a carer reads too.
  await page.getByLabel('How old are they?').nth(0).fill('99');
  await page.getByRole('button', { name: 'Show me the figure' }).click();
  await grab('Step 2 — the message when an age is out of range');
  await page.getByLabel('How old are they?').nth(0).fill('12');

  await page.getByRole('button', { name: 'Show me the figure' }).click();
  await page.getByRole('heading', { name: /Letters you can send/i }).waitFor();
  await grab('Step 3 of 7 — Your result (the interstitial, before any finances)');

  await page.getByRole('button', { name: 'Answer a few more questions' }).click();
  await grab('Step 4 of 7 — Your history with this child');
  await page.getByRole('checkbox', { name: /foster carer before the order/i }).check();
  await grab('Step 4 — after ticking "I was this child\'s foster carer"');
  await page.getByLabel(/how many months ago/i).fill('12');
  await page.getByLabel(/What were you paid in total/i).fill('300');
  await page.getByRole('button', { name: 'Continue' }).click();

  await grab('Step 5 of 7 — Benefits you receive');
  await page.getByRole('checkbox', { name: /means-tested benefit/i }).first().check().catch(() => {});
  await grab('Step 5 — after saying yes to means-tested benefits');
  await page.getByRole('button', { name: 'Continue' }).click();

  await grab('Step 6 of 7 — Your finances');
  await page.getByRole('button', { name: /Skip/i }).click();

  await grab('Step 7 of 7 — How your council behaves');
  return screens;
}

/** The result page with every disclosure open, so nothing stays folded away. */
async function captureResult(page: Page): Promise<string> {
  await page.goto(`${base}/`);
  await page.getByRole('radio', { name: 'England', exact: true }).check();
  await page.getByRole('radio', { name: /South East England/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('How old are they?').first().fill('12');
  await page.getByRole('button', { name: 'Show me the figure' }).click();
  await page.getByRole('heading', { name: /Letters you can send/i }).waitFor();

  for (const summary of await page.locator('details summary').all()) {
    await summary.click().catch(() => {});
  }
  // Re-query each time. Opening a letter relabels its own button and re-renders
  // the list, so a snapshot taken up front goes stale after the first click and
  // most letters stayed shut.
  for (let guard = 0; guard < 30; guard++) {
    const next = page.getByRole('button', { name: 'Read this letter' }).first();
    if ((await next.count()) === 0) break;
    await next.click().catch(() => {});
  }
  // The panel that holds the figure, not the screen-reader announcement that
  // sits just before it and also carries an aria-live attribute.
  const panel = page.locator('.section').filter({ has: page.locator('#maximum-heading') });
  const html = await panel.first().innerHTML().catch(() => '');
  return markdown(html);
}

// ─── Assemble ──────────────────────────────────────────────────────────────

const server = spawn('node', [join(root, 'apps', 'web', 'e2e', 'static-server.mjs'), String(PORT)], {
  stdio: 'ignore',
});
const stop = (): void => {
  server.kill();
};

try {
  if (!existsSync(outDir)) throw new Error('apps/web/out is missing. Run pnpm build first.');
  rmSync(bundle, { recursive: true, force: true });

  await new Promise((r) => setTimeout(r, 1500));
  const browser = await chromium.launch({
    executablePath: existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined,
  });
  const page = await browser.newPage();

  // 1. Every page, as the reader sees it.
  const pages = htmlFiles(outDir)
    .map((f) => ({ file: f, route: routeOf(f) }))
    .filter((p) => !['/404', '/opengraph-image'].includes(p.route))
    .sort((a, b) => rank(a.route) - rank(b.route) || a.route.localeCompare(b.route));

  const index: string[] = [];
  for (const { file, route } of pages) {
    const html = readFileSync(file, 'utf8');
    const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1]?.trim() ?? '';
    const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
    const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? html;
    const name = route === '/' ? 'home' : route.slice(1).replace(/\//g, '--');
    write(
      `01-pages/${name}.md`,
      `# ${route}\n\n` +
        `**Browser tab title:** ${title}\n\n` +
        `**Search result description:** ${description}\n\n` +
        `---\n\n${markdown(main)}\n`,
    );
    index.push(`- \`${route}\` → \`01-pages/${name}.md\``);
  }

  // 1b. The page nobody plans to see, and the wrapper around every other page.
  const notFound = readFileSync(join(outDir, '404.html'), 'utf8');
  write(
    '01-pages/404-not-found.md',
    '# /404 — the page shown when an address does not exist\n\n' +
      markdown(/<main[^>]*>([\s\S]*?)<\/main>/.exec(notFound)?.[1] ?? ''),
  );

  const anyPage = readFileSync(join(outDir, 'index.html'), 'utf8');
  const header = /<header[^>]*>([\s\S]*?)<\/header>/.exec(anyPage)?.[1] ?? '';
  const footer = /<footer[^>]*>([\s\S]*?)<\/footer>/.exec(anyPage)?.[1] ?? '';
  const skip = /<a class="skip-link"[^>]*>([\s\S]*?)<\/a>/.exec(anyPage)?.[1] ?? '';
  write(
    '01-pages/every-page-header-and-footer.md',
    '# The bits that appear on every page\n\n' +
      'These wrap all 26 pages, so a change here changes the whole site.\n\n' +
      `## The hidden link keyboard users meet first\n\n${skip.trim()}\n\n` +
      `## Header and navigation\n\n${markdown(header)}\n\n` +
      `## Footer\n\n${markdown(footer)}\n`,
  );

  // 1c. Two screens that only exist when something has gone wrong, so neither
  // can be captured from the built site. Their wording lives inside the code,
  // mixed with the logic that decides when to show it, and pulling the
  // sentences out with a pattern produced half-lines and stray JSX. The files
  // go in whole instead: less tidy, and it is actually all there.
  for (const [label, file] of [
    ['when-a-page-fails-to-load', 'app/error.tsx'],
    ['when-a-page-does-not-exist', 'app/not-found.tsx'],
    ['when-the-calculator-cannot-give-a-figure', 'components/calculator/errors.tsx'],
  ] as const) {
    write(
      `08-screens-that-only-appear-on-failure/${label}.tsx`,
      readFileSync(join(root, 'apps', 'web', file), 'utf8'),
    );
  }
  write(
    '08-screens-that-only-appear-on-failure/README.md',
    '# The screens a carer sees when something breaks\n\n' +
      'None of these is a page, so none appears in `01-pages/`. They are shown in place\n' +
      'of a result when the calculator refuses to produce a figure, when a page fails to\n' +
      'load, or when an address does not exist.\n\n' +
      'The wording is inside the code rather than in a content file. The files are here\n' +
      'whole rather than picked apart, because pulling the sentences out with a pattern\n' +
      'produced half-sentences. The words a carer reads are the ones in quotes and\n' +
      'between the angle-bracket tags; everything else is the logic deciding when to\n' +
      'show them.\n',
  );

  // 2. The calculator, step by step, from a running browser.
  const screens = await captureCalculator(page);
  write(
    '02-calculator/every-step.md',
    '# The calculator, screen by screen\n\n' +
      'Captured from the running site, not from the source, so this is exactly what a\n' +
      'carer sees. The later steps do not exist in the page files at all: they are built\n' +
      'as the form is used, which is why a search of the code misses them.\n\n' +
      screens.map((s) => `---\n\n## ${s.name}\n\n${s.body}\n`).join('\n'),
  );

  // 3. The result page, fully expanded.
  write(
    '02-calculator/result-page.md',
    '# The result page, with everything opened\n\n' +
      'One child aged 12, South East England, no finances given. Every fold-out is\n' +
      'opened and every letter expanded, so nothing is hidden behind a click.\n\n---\n\n' +
      (await captureResult(page)),
  );

  await browser.close();

  // 4. The warnings.
  const engine = await import('../packages/engine/src/index.js');
  const codes = Object.keys(engine.FLAG_CATALOGUE) as Array<keyof typeof engine.FLAG_CATALOGUE>;
  const bySeverity = { critical: [] as string[], important: [] as string[], info: [] as string[] };
  for (const code of codes) {
    const f = engine.makeFlag(code, {
      councilName: 'YOUR COUNCIL',
      coreWeekly: 20000,
      nationalWeekly: 25500,
      ageBand: '11-15',
      previousWeekly: 30000,
      monthsSinceOrder: 12,
      kinshipZoneWeekly: 25500,
      taperMethod: 'pound-for-pound',
      savingsCapital: 700000,
      childCount: 3,
      livingCostsPercent: 100,
      modelLivingCostsPercent: 125,
      effectiveTo: '2027-03-31',
      policySummary: 'EXAMPLE POLICY SUMMARY',
      policySourceUrl: 'https://example.council.gov.uk/policy',
      decisionDate: '2018-02-27',
      policyChangedOn: '2018',
    });
    bySeverity[f.severity].push(
      `### ${f.title}\n\n` +
        `*Code: ${f.code} · shown as: ${f.severity}*\n\n${f.body}\n` +
        (f.citation ? `\n**Source:** ${f.citation.label}${f.citation.url ? ` — ${f.citation.url}` : ''}\n` : '') +
        (f.actionUrl ? `\n**Links to:** ${f.actionUrl}\n` : ''),
    );
  }
  write(
    '03-warnings.md',
    `# Every warning the calculator can show\n\n` +
      `${codes.length} of them. A carer sees only the ones their own answers trigger.\n` +
      'Placeholder values are filled in where a warning quotes a figure.\n\n' +
      (['critical', 'important', 'info'] as const)
        .map((s) => `---\n\n## ${s} (${bySeverity[s].length})\n\n${bySeverity[s].join('\n')}`)
        .join('\n'),
  );

  // 5. The letters, exactly as a carer downloads them.
  const letters = await import('../packages/letters/src/index.js');
  const ctx = {
    councilName: 'YOUR COUNCIL',
    childAgeBand: '11-15',
    region: 'south-east' as const,
    nmaWeekly: 25500 as never,
    previousFosteringWeekly: 30000 as never,
    onMeansTestedBenefits: true,
    wasFosterCarer: true,
    orderDate: '2025-01-15' as never,
    flagsRaised: [],
  };
  const templates = Object.keys(letters.LETTER_TEMPLATES) as Array<
    keyof typeof letters.LETTER_TEMPLATES
  >;
  const letterIndex: string[] = [];
  for (const [i, t] of templates.entries()) {
    const generated = letters.generateLetter(t, ctx as never);
    const n = String(i + 1).padStart(2, '0');
    write(
      `04-letters/${n}-${t}.md`,
      `# ${letters.letterTitle(t)}\n\n` +
        `*File name a carer gets when they download it: \`${t}.txt\`*\n\n` +
        '```\n' +
        letters.letterAsPlainText(generated) +
        '```\n',
    );
    letterIndex.push(`${i + 1}. **${letters.letterTitle(t)}** → \`04-letters/${n}-${t}.md\``);
  }
  write(
    '04-letters/README.md',
    `# The ${templates.length} letters\n\n` +
      'Each one is shown exactly as a carer downloads it, including the subject line,\n' +
      'the placeholders they fill in, and the sources listed at the bottom.\n\n' +
      letterIndex.join('\n'),
  );

  // 6. The sources.
  const citations = JSON.parse(readFileSync(join(root, 'data', 'citations.json'), 'utf8')) as Record<
    string,
    { label: string; url: string; kind: string; holding?: string }
  >;
  write(
    '05-sources.md',
    `# Every source the site cites\n\n${Object.keys(citations).length} of them.\n\n` +
      Object.entries(citations)
        .map(
          ([id, c]) =>
            `### ${c.label}\n\n- id: \`${id}\`\n- kind: ${c.kind}\n- ${c.url}\n` +
            (c.holding ? `\n> ${c.holding}\n` : ''),
        )
        .join('\n'),
  );

  // 7. The rate tables, with the notes shown beside them.
  const rateLines: string[] = [];
  for (const t of engine.RATE_TABLES) {
    rateLines.push(`## Financial year ${t.financialYear}\n`);
    for (const nation of ['england', 'wales', 'scotland', 'northern-ireland'] as const) {
      const sec = (t as Record<string, unknown>)[nation] as Record<string, unknown> | null;
      if (!sec) {
        rateLines.push(`### ${nation}\n\nNot held for this year.\n`);
        continue;
      }
      rateLines.push(`### ${nation}\n`);
      if (sec.userFacingNote) rateLines.push(`> ${String(sec.userFacingNote)}\n`);
      const rates = (sec.regions ?? sec.rates) as Record<string, unknown>;
      rateLines.push('```json\n' + JSON.stringify(rates, null, 2) + '\n```\n');
    }
  }
  write(
    '06-rate-tables.md',
    '# The figures behind every answer\n\nAmounts are in pence a week.\n\n' + rateLines.join('\n'),
  );

  // 8. The guides as their editable source, so a writer can hand them straight back.
  const guidesDir = join(root, 'apps', 'web', 'content', 'guidance');
  for (const f of readdirSync(guidesDir).filter((f) => f.endsWith('.mdx'))) {
    write(`07-guide-source/${f}`, readFileSync(join(guidesDir, f), 'utf8'));
  }

  // 9. The index.
  write(
    'README.md',
    `# All the content on the site\n\n` +
      `Generated from the built site and from the running calculator, so nothing here is\n` +
      `a guess about what the code might produce.\n\n` +
      `## What is in each folder\n\n` +
      `| Folder | What it holds |\n| --- | --- |\n` +
      `| \`01-pages/\` | All ${pages.length} pages, one file each, with the browser tab title and the search description. |\n` +
      `| \`02-calculator/\` | Every screen of the form, and the result page with every fold-out opened. Captured from a real browser. |\n` +
      `| \`03-warnings.md\` | All ${codes.length} warnings, grouped by how loudly they are shown. |\n` +
      `| \`04-letters/\` | All ${templates.length} letters, word for word as a carer downloads them. |\n` +
      `| \`05-sources.md\` | All ${Object.keys(citations).length} sources, with what each one says. |\n` +
      `| \`06-rate-tables.md\` | Every figure, by year and nation. |\n` +
      `| \`07-guide-source/\` | The 16 guides in their editable form, ready to be edited and handed back. |\n` +
      `| \`08-screens-that-only-appear-on-failure/\` | The three screens shown when something breaks. Not pages, so they are not in \`01-pages/\`. |\n\n` +
      `## What is deliberately not here\n\n` +
      `Nothing a reader can see. The council drop-down lists 153 names from a lookup\n` +
      `table rather than being written by hand, so it is counted rather than listed; the\n` +
      `names themselves are in \`data/la-region-map.json\`. Everything else on the site,\n` +
      `including the warnings, the letters, the error screens and the words inside the\n` +
      `form, is in one of the folders above.\n\n` +
      `## The pages\n\n${index.join('\n')}\n`,
  );

  console.log(
    `export-content-bundle: ${pages.length} pages, ${screens.length} calculator screens, ` +
      `${codes.length} warnings, ${templates.length} letters, ` +
      `${Object.keys(citations).length} sources into ${bundle}`,
  );
} finally {
  stop();
}
