/** Letter generation, spec §18, including the copy rules. */

import { describe, expect, it } from 'vitest';
import { pence, type EnglandRegion, type FlagCode } from '@sgo/engine';
import {
  LETTER_TEMPLATES,
  generateLetter,
  letterAsPlainText,
  letterTitle,
  suggestLetters,
  type LetterContext,
  type LetterTemplate,
} from '../index.js';

const ctx = (over: Partial<LetterContext> = {}): LetterContext => ({
  councilName: 'Testshire Council',
  childAgeBand: '11-15',
  region: 'south-east' as EnglandRegion,
  nmaWeekly: pence(25500),
  onMeansTestedBenefits: false,
  wasFosterCarer: false,
  flagsRaised: [],
  ...over,
});

const ALL = Object.keys(LETTER_TEMPLATES) as LetterTemplate[];

describe('letters', () => {
  it('generates every template with a subject, a body and citations', () => {
    for (const t of ALL) {
      const letter = generateLetter(t, ctx());
      expect(letter.subject.length).toBeGreaterThan(0);
      expect(letter.body.length).toBeGreaterThan(100);
      expect(letter.citations.length).toBeGreaterThan(0);
      expect(letterTitle(t).length).toBeGreaterThan(0);
    }
  });

  it('leaves the placeholders visible for the carer to fill in', () => {
    for (const t of ALL) {
      const { body } = generateLetter(t, ctx());
      expect(body).toContain('[YOUR NAME]');
      expect(body).toContain("[CHILD'S NAME]");
      expect(body).toContain('[REFERENCE]');
    }
  });

  it('never asserts the council has broken the law, and never threatens', () => {
    // These letters go to a social worker the carer has an ongoing relationship
    // with. An aggressive letter damages that relationship and the placement.
    const forbidden = [
      /\bunlawful\b/i,
      /\billegal\b/i,
      /\byou (have )?broke\w*\b/i,
      /\bin breach of\b/i,
      /\blegal action\b/i,
      /\bsue\b/i,
      /\bsolicitor\b/i,
      /\bdemand\b/i,
      /\bimmediately\b/i,
      /\bfailed to comply\b/i,
    ];
    for (const t of ALL) {
      const { body } = generateLetter(t, ctx({ onMeansTestedBenefits: true }));
      for (const re of forbidden) {
        expect(body, `${t} must not contain ${re}`).not.toMatch(re);
      }
    }
  });

  it('asks rather than demands', () => {
    for (const t of ALL) {
      const { body } = generateLetter(t, ctx());
      expect(body.toLowerCase()).toMatch(/please|grateful|would like|i am asking/);
    }
  });

  it('keeps the legal reference to a line, not an essay', () => {
    for (const t of ALL) {
      const { body } = generateLetter(t, ctx());
      // No letter should be longer than roughly a single side of A4.
      expect(body.split('\n').length).toBeLessThan(45);
    }
  });

  it('pre-fills the carer\'s own figures', () => {
    const letter = generateLetter('challenge-fixed-percentage', ctx({ currentlyPaidWeekly: pence(15000) }));
    expect(letter.body).toContain('£255');
    expect(letter.body).toContain('£150');
    expect(letter.body).toContain('the South East');
    expect(letter.body).toContain('11-15');
  });

  it('adapts the Child Benefit letter to a means-tested claimant', () => {
    const meansTested = generateLetter('challenge-child-benefit-deduction', ctx({ onMeansTestedBenefits: true }));
    expect(meansTested.body).toMatch(/Ombudsman/);
    const not = generateLetter('challenge-child-benefit-deduction', ctx({ onMeansTestedBenefits: false }));
    expect(not.body).not.toMatch(/Ombudsman/);
  });

  it('puts the Child Benefit challenge first when that flag fired (§18)', () => {
    const suggested = suggestLetters(['UNLAWFUL_CB_DEDUCTION_RISK', 'ANNUAL_REVIEW_DUE'] as FlagCode[]);
    expect(suggested[0]).toBe('challenge-child-benefit-deduction');
    expect(suggested).toHaveLength(ALL.length);
  });

  it('suggests the reg 7 letter to a former foster carer', () => {
    const suggested = suggestLetters(['REG7_EXPIRING'] as FlagCode[]);
    expect(suggested[0]).toBe('request-reg7-extension');
  });

  it('still offers every letter when no flag matched', () => {
    expect(suggestLetters([])).toHaveLength(ALL.length);
  });

  it('renders a .txt download with its sources and the disclaimer', () => {
    const text = letterAsPlainText(generateLetter('request-written-policy', ctx()));
    expect(text).toMatch(/^Subject: /);
    expect(text).toMatch(/What this letter refers to:/);
    expect(text).toMatch(/not legal advice/);
  });

  it('addresses the letter generically when no council is known', () => {
    const letter = generateLetter('request-written-policy', ctx({ councilName: undefined }));
    expect(letter.body).toMatch(/^Dear Children's Services,/);
  });
});
