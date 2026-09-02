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
      const id = obj.sourceId;
      if (typeof id === 'string' && !citationIds.has(id)) {
        report.fail('13 sourceId', `${file}${path}.sourceId names source "${id}", which is not in citations.json`);
      }
    });
  }
}
