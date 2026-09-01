/**
 * Export the words that leave the site: the warnings shown on a result, and the
 * letters a carer sends to their council.
 *
 * These were handed to a reviewer as a list of titles, which is not a thing
 * anybody can review. A letter's risk is in its sentences: whether it concedes
 * something, whether it demands rather than asks, whether it is offered before
 * the carer has done the step that should come first. None of that is visible
 * from "Ask for your annual review".
 *
 * So this renders them in full, exactly as a carer receives them, with the
 * conditional sentences shown, the order they are offered in, and the source
 * behind each one.
 *
 * Run: pnpm export:review
 */
import { mkdirSync, rmSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FLAG_CATALOGUE,
  makeFlag,
  pence,
  type FlagCode,
  type FlagContext,
} from '../packages/engine/src/index.js';
import {
  LETTER_TEMPLATES,
  generateLetter,
  suggestLetters,
  type LetterContext,
  type LetterTemplate,
} from '../packages/letters/src/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'review-pack');

/** A carer with every optional detail filled in, so no sentence is hidden. */
const FULL: LetterContext = {
  councilName: 'Anytown Council',
  childAgeBand: '5-10',
  region: 'rest-of-england',
  nmaWeekly: pence(18700),
  currentlyPaidWeekly: pence(12000),
  onMeansTestedBenefits: true,
  wasFosterCarer: true,
  orderDate: '2025-03-01',
  flagsRaised: [],
};

/** The same carer with the optional details absent, which changes the text. */
const SPARSE: LetterContext = {
  childAgeBand: '5-10',
  region: 'rest-of-england',
  nmaWeekly: pence(18700),
  onMeansTestedBenefits: false,
  wasFosterCarer: false,
  flagsRaised: [],
};

/** Enough context that every flag body renders its longest form. */
const FLAG_CTX: FlagContext = {
  councilName: 'Anytown Council',
  coreWeekly: pence(12000),
  nationalWeekly: pence(18700),
  ageBand: '5-10',
  previousWeekly: pence(30000),
  monthsSinceOrder: 18,
  kinshipZoneWeekly: pence(18700),
  taperMethod: 'pound-for-pound',
  savingsCapital: pence(700000),
  childCount: 2,
  policySummary: '[The summary of the published decision about this council goes here.]',
  policySourceUrl: 'https://example.invalid/decision',
  effectiveTo: '2027-03-31',
  livingCostsPercent: 100,
  modelLivingCostsPercent: 125,
  policyChangedOn: '1 January 2024',
  supersededSummary: '[The later decision that did not uphold the complaint goes here.]',
  policyUnderReviewNote: '[The council\'s own words about its policy being rewritten go here.]',
};

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'letters'), { recursive: true });
mkdirSync(join(out, 'warnings'), { recursive: true });

// Which guidance page links each letter, so the reviewer can see where a carer
// meets it. Sequencing complaints are about exactly this.
const linkedFrom = new Map<LetterTemplate, string[]>();
const guidanceDir = join(root, 'apps', 'web', 'content', 'guidance');
for (const f of readdirSync(guidanceDir).filter((x) => x.endsWith('.mdx'))) {
  const text = readFileSync(join(guidanceDir, f), 'utf8');
  for (const m of text.matchAll(/<LetterCTA\s+template="([^"]+)"/g)) {
    const t = m[1] as LetterTemplate;
    linkedFrom.set(t, [...(linkedFrom.get(t) ?? []), `/guidance/${f.replace('.mdx', '')}`]);
  }
}

const offerOrder = suggestLetters([]);
const letterIndex: string[] = [];

for (const [i, template] of offerOrder.entries()) {
  const spec = LETTER_TEMPLATES[template];
  const full = generateLetter(template, FULL);
  const sparse = generateLetter(template, SPARSE);
  const differs = full.body !== sparse.body;

  letterIndex.push(`| ${i + 1} | ${spec.title} | \`${template}\` |`);

  const doc = `# Letter ${i + 1} of ${offerOrder.length}: ${spec.title}

| | |
|---|---|
| Reference | \`${template}\` |
| Offered in position | ${i + 1} of ${offerOrder.length}, when nothing specific has been triggered |
| Brought to the top when | ${spec.suggestedBy.length ? spec.suggestedBy.map((f) => `the "${FLAG_CATALOGUE[f].title}" warning appears`).join(', or ') : 'never promoted; it sits in the standing list'} |
| Linked from | ${(linkedFrom.get(template) ?? ['not linked from any guidance page']).join(', ')} |

## What it refers to

${full.citations.map((c) => `- **${c.label}**${c.url ? `\n  ${c.url}` : '\n  (no public link yet)'}`).join('\n') || '- Nothing cited.'}

## The letter as a carer receives it

Shown for a carer whose council we know, who is on means-tested benefits, who
fostered the child before the order, and who told us what they are paid. Square
brackets are placeholders the carer fills in.

**Subject:** ${full.subject}

---

${full.body}

---
${
  differs
    ? `
## How it reads for a carer who gave us less

Shown for a carer who did not name their council, is not on means-tested
benefits, and did not tell us what they are paid. The sentences that change are
the ones worth checking, because they are the ones that appear conditionally.

**Subject:** ${sparse.subject}

---

${sparse.body}

---
`
    : '\nThis letter reads the same for every carer. Nothing in it is conditional.\n'
}
## Questions for the reviewer

1. Could a carer sending this be put in a worse position than by saying nothing?
2. Does it concede anything, or accept a premise the carer might want to contest later?
3. Is it a request throughout, never a demand or a threat?
4. Is the legal reference the right one, and is it stated at the right strength?
5. Is this the right point in the sequence to offer it, given where it is linked from above?
`;
  writeFileSync(join(out, 'letters', `${String(i + 1).padStart(2, '0')}-${template}.md`), doc);
}

// ── The warnings ───────────────────────────────────────────────────────────
const bySeverity: Record<string, string[]> = { critical: [], important: [], info: [] };
for (const code of Object.keys(FLAG_CATALOGUE) as FlagCode[]) {
  const flag = makeFlag(code, FLAG_CTX);
  const block = `### ${flag.title}

- Reference: \`${code}\`
- Shown under: ${flag.severity === 'critical' ? '"Check these first"' : flag.severity === 'important' ? '"Worth raising"' : '"Worth knowing"'}
- Source: ${flag.citation ? `${flag.citation.label}${flag.citation.url ? ` (${flag.citation.url})` : ' (no public link yet)'}` : 'none cited'}
- Links to: ${flag.actionUrl ?? 'no guidance page'}

${flag.body}
`;
  bySeverity[flag.severity]!.push(block);
}

for (const [severity, heading, blurb] of [
  ['critical', 'Check these first', 'The highest risk copy on the site. These appear in red and tell a carer something may be wrong with what their council is doing.'],
  ['important', 'Worth raising', 'Things a carer should take up, shown in amber. Lower alarm, same need for accuracy.'],
  ['info', 'Worth knowing', 'Context and things people commonly miss. Lowest risk, but still statements of law.'],
] as const) {
  const blocks = bySeverity[severity]!;
  writeFileSync(
    join(out, 'warnings', `${severity}.md`),
    `# Warnings shown under "${heading}"\n\n${blurb}\n\n${blocks.length} of them.\n\n` +
      'Square brackets mark text filled in from the carer\'s own answers.\n\n' +
      `${blocks.join('\n')}`,
  );
}

const index = `# The words that leave the site

Exported ${new Date().toISOString().slice(0, 10)}.

This is the copy the sixteen guidance pages do not cover: the warnings a carer
sees on their result, and the letters they send to their council. It is the
highest risk writing on the site, because it is what ends up on a council desk.

An earlier pack listed the letters by title only. A title cannot be reviewed.
Whether a letter concedes something, demands rather than asks, or is offered
before the step that should come first, is in its sentences. Everything is set
out in full here.

## The eight letters

Shown in the order a carer is offered them when nothing specific has been
triggered. A letter jumps to the top when its matching warning appears, and
each file says which warning does that.

| Order | Letter | Reference |
|---|---|---|
${letterIndex.join('\n')}

Each file also names the guidance pages that link to it, which is where a
sequencing question can be answered.

## The warnings

${Object.entries(bySeverity)
  .map(([sev, list]) => `- **${sev}**: ${list.length}`)
  .join('\n')}

Split by how loudly they are shown. The critical ones are the ones to read
first: they tell a carer something may be wrong with what their council is
doing, and they are the closest the site comes to an accusation.

## The house rules these were written to

From the specification, and they matter more than the templating:

- Polite, short, specific. These go to a social worker the carer has an ongoing
  relationship with. An aggressive letter damages that relationship, and the
  child's placement.
- Always request, never demand or threaten.
- Cite the regulation or decision in one line, not a legal essay.
- **Never assert the council has broken the law.** State what the guidance and
  the decisions say, and ask the council to confirm its position.
- Leave the placeholders visible so the carer knows what to fill in.

Please say where the copy falls short of these, as well as where it is wrong.
`;
writeFileSync(join(out, '00-INDEX.md'), index);

console.log(
  `export-review-pack: ${offerOrder.length} letters and ` +
    `${Object.values(bySeverity).reduce((n, l) => n + l.length, 0)} warnings into review-pack/`,
);
