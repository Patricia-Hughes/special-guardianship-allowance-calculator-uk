/**
 * The wording on the result page itself.
 *
 * Twice now a finding has been fixed in the warnings and left standing in the
 * result UI, because the review packs export the warnings, the letters and the
 * guidance pages, and the result page's own copy is in none of them. Regulation
 * 7 was called a protection in two components after it had been reworded
 * everywhere else, and the unsourced "councils must have a published policy"
 * outlived its removal from the warning by a day.
 *
 * So these read the component source directly. It is a blunt test and it is the
 * right one: the failure mode is a sentence surviving in a file nobody thought
 * to look at, which no amount of rendering tests would catch either.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(__dirname, '..', 'components', 'results');
const files = readdirSync(dir).filter((f) => f.endsWith('.tsx'));

/** Only the strings a carer reads, not our comments explaining the history. */
function prose(source: string): string {
  return source
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join('\n');
}

describe('the result page says nothing the rest of the site has stopped saying', () => {
  const BANNED: Array<[RegExp, string]> = [
    [
      /\bprotect(s|ed|ion)\b/i,
      'Regulation 7 lets a council keep paying the reward element and lets it stop. ' +
        'Calling it a protection tells a carer they hold a right they do not.',
    ],
    [
      /Councils must have a published policy/i,
      'Unsourced. The duty on record is to publish a kinship local offer, from October 2024.',
    ],
    [
      /has been ruled unlawful/i,
      'No court has held fixed percentages unlawful as a class, and the Ombudsman says fault.',
    ],
    [
      /\bmust\*{0,2}\s+assess\b/i,
      'Regulation 6 governs when support is payable, not when an assessment is owed. ' +
        'The provision behind the duty is not yet confirmed.',
    ],
    [
      /you are entitled to \d|guaranteed/i,
      'Financial support is discretionary. Nothing here may promise an amount.',
    ],
  ];

  it.each(files)('%s', (file) => {
    const text = prose(readFileSync(join(dir, file), 'utf8'));
    for (const [pattern, why] of BANNED) {
      const hit = pattern.exec(text);
      expect(hit === null, hit ? `found "${hit[0]}" in ${file}. ${why}` : '').toBe(true);
    }
  });

  it('covers every component on the result page', () => {
    // If a new component appears and this list is not the reason, the test above
    // silently stops covering it.
    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(files).toContain('NextSteps.tsx');
    expect(files).toContain('MaximumHero.tsx');
  });
});
