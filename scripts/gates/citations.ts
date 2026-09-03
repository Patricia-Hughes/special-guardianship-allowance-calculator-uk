/**
 * Gates 7 and 13: nothing cites a source that does not exist.
 *
 * Gate 7 covers the ids that code and content cite. Gate 13 covers the ids the
 * DATA points at, which nothing checked for a while: a rate table could name a
 * source that did not exist and nothing would notice, so the figure looked
 * sourced and was unattributable.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NATIONS, ROOT, visit, walk, type GateContext, type RateSection } from './context';

const CITE_CALL = /\bcite\(\s*['"]([a-z0-9-]+)['"]\s*\)/g;
const CITE_TAG = /<Cite\s+id=["']([a-z0-9-]+)["']/g;
const CITATIONS_FRONTMATTER = /^citations:\s*\[([^\]]*)\]/gm;

export function checkCitedIds({ citationIds, report }: GateContext): void {
  const sourceFiles = [
    ...walk(join(ROOT, 'packages'), ['.ts', '.tsx']),
    ...walk(join(ROOT, 'apps'), ['.ts', '.tsx', '.mdx']),
  ].filter((f) => !f.includes('/data/') && !f.includes('__tests__'));

  for (const file of sourceFiles) {
    const text = readFileSync(file, 'utf8');
    const rel = file.slice(ROOT.length + 1);

    for (const pattern of [CITE_CALL, CITE_TAG]) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const id = match[1]!;
        if (!citationIds.has(id)) {
          report.fail('7 citations', `${rel} references citation "${id}", which is not in citations.json`);
        }
      }
    }

    CITATIONS_FRONTMATTER.lastIndex = 0;
    let frontmatter: RegExpExecArray | null;
    while ((frontmatter = CITATIONS_FRONTMATTER.exec(text)) !== null) {
      for (const raw of frontmatter[1]!.split(',')) {
        const id = raw.trim().replace(/^["']|["']$/g, '');
        if (id && !citationIds.has(id)) {
          report.fail('7 citations', `${rel} frontmatter references citation "${id}", not in citations.json`);
        }
      }
    }
  }
}

export function checkDataSourceIds({ rateDocs, docs, citationIds, report }: GateContext): void {
  for (const [file, doc] of rateDocs) {
    for (const nation of NATIONS) {
      const section = doc[nation] as RateSection | null | undefined;
      if (section?.sourceId && !citationIds.has(section.sourceId)) {
        report.fail(
          '7 citations',
          `${file} ${nation}.sourceId "${section.sourceId}" is not in citations.json`,
        );
      }
    }
  }

  for (const [file, doc] of docs) {
    if (file === 'citations.json') continue;
    visit(doc, '', (obj, path) => {
      // approvalSourceId names the document that approved a figure without
      // carrying it. It is a reference like any other and must resolve.
      for (const key of ['sourceId', 'approvalSourceId'] as const) {
        const id = obj[key];
        if (typeof id === 'string' && !citationIds.has(id)) {
          report.fail('13 sourceId', `${file}${path}.${key} names source "${id}", which is not in citations.json`);
        }
      }
    });
  }
}

/**
 * Gate 19: a data block that produces a figure must NAME its source.
 *
 * Gates 7 and 13 check that every id which IS named resolves. Neither notices a
 * block that names nothing at all, and two did: Kinship Zones, which outputs a
 * full allowance with no means test, and Guardian's Allowance. Both were
 * invisible to the source checks precisely because they were silent.
 *
 * R3 says every numeric output carries the citation it derives from. This is
 * that rule applied to the data rather than to the result.
 */
const MUST_NAME_A_SOURCE: Array<{ file: string; path: string[]; why: string }> = [
  { file: 'kinship-zones.json', path: [], why: 'the pilot path outputs a full allowance figure' },
  { file: 'benefits.2025-26.json', path: ['childBenefit'], why: 'Child Benefit can be deducted' },
  { file: 'benefits.2025-26.json', path: ['guardiansAllowance'], why: 'the amount is shown to carers' },
  { file: 'benefits.2026-27.json', path: ['childBenefit'], why: 'Child Benefit can be deducted' },
  { file: 'benefits.2026-27.json', path: ['guardiansAllowance'], why: 'the amount is shown to carers' },
];

export function checkFiguresNameASource({ docs, citationIds, report }: GateContext): void {
  for (const { file, path, why } of MUST_NAME_A_SOURCE) {
    const doc = docs.get(file);
    if (!doc) {
      report.fail('19 named sources', `${file} is listed as needing a source but does not exist`);
      continue;
    }
    const block = path.reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], doc);
    const where = [file, ...path].join('.');
    if (block === undefined || block === null) {
      report.fail('19 named sources', `${where} is missing, and it is required to name a source`);
      continue;
    }
    const id = (block as Record<string, unknown>).sourceId;
    if (typeof id !== 'string' || id.length === 0) {
      report.fail(
        '19 named sources',
        `${where} names no source, and ${why}. Add a sourceId, or take the figure out.`,
      );
    } else if (!citationIds.has(id)) {
      report.fail('19 named sources', `${where} names source "${id}", which is not in citations.json`);
    }
  }
}
