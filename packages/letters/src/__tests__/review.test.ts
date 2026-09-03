/**
 * The Job A review, pinned.
 *
 * Every one of these is a finding a legal reviewer had to read the full text to
 * catch. None of them would break a build, produce a wrong number, or look
 * wrong on screen. They are exactly the class of defect that comes back
 * silently in six months when somebody tidies the copy, so each is a test.
 */
import { describe, expect, it } from 'vitest';
import { pence } from '@sgo/engine';
import {
  LETTER_TEMPLATES,
  generateLetter,
  letterAsPlainText,
  lettersRequiredFirst,
  suggestLetters,
  type LetterContext,
  type LetterTemplate,
} from '../index.js';

const ctx = (over: Partial<LetterContext> = {}): LetterContext => ({
  councilName: 'Anytown Council',
  childAgeBand: '5-10',
  region: 'rest-of-england',
  nmaWeekly: pence(18700),
  previousFosteringWeekly: pence(12000),
  onMeansTestedBenefits: true,
  wasFosterCarer: true,
  orderDate: '2025-03-01',
  flagsRaised: [],
  ...over,
});

const ALL = Object.keys(LETTER_TEMPLATES) as LetterTemplate[];

describe('finding 1: a complaint is never promoted by someone else’s case', () => {
  it('no flag brings the formal complaint to the top', () => {
    for (const t of ALL) {
      if (t === 'formal-complaint-stage-1') {
        expect(LETTER_TEMPLATES[t].suggestedBy).toHaveLength(0);
      }
    }
    // Including the finding that used to promote it.
    const order = suggestLetters(['LGSCO_FINDING_AGAINST_LA']);
    expect(order[0]).not.toBe('formal-complaint-stage-1');
    expect(order[order.length - 1]).toBe('formal-complaint-stage-1');
  });

  it('says what has to be asked first', () => {
    expect(lettersRequiredFirst('formal-complaint-stage-1')).toEqual([
      "Ask for your council's written policy",
      'Ask for the arithmetic behind your figure',
    ]);
    // And no other letter carries a prerequisite, so the gate stays meaningful.
    for (const t of ALL.filter((x) => x !== 'formal-complaint-stage-1')) {
      expect(lettersRequiredFirst(t), `${t} should not be gated`).toEqual([]);
    }
  });
});

describe('finding 2: the site never asserts what it cannot know', () => {
  it('the complaint does not claim the carer raised this before', () => {
    for (const paid of [pence(12000), undefined]) {
      const body = generateLetter('formal-complaint-stage-1', ctx({ previousFosteringWeekly: paid })).body;
      expect(body).not.toMatch(/I have raised this before/);
      expect(body).toMatch(/delete this sentence/);
    }
  });
});

describe('finding 3: regulation 7 is a power, not a protection', () => {
  it('no letter tells a carer their allowance is protected', () => {
    for (const t of ALL) {
      const body = generateLetter(t, ctx()).body;
      expect(body, `${t} still says protected`).not.toMatch(/\bprotect(s|ed|ion)\b/i);
    }
  });

  it('the extension letter asks, and does not concede the drop', () => {
    const body = generateLetter('request-reg7-extension', ctx()).body;
    expect(body).toMatch(/can continue paying|can carry on paying/);
    // The question that accepted the allowance would fall is gone.
    expect(body).not.toMatch(/what my allowance will be after that date/);
  });

  it('a carer being tapered gets the letter that asks about tapering', () => {
    const first = suggestLetters(['REG7_MISAPPLICATION_WARNING'])[0];
    expect(first).toBe('ask-which-element-reduced');
    const body = generateLetter('ask-which-element-reduced', ctx()).body;
    expect(body).toMatch(/which element of my allowance is being reduced/);
  });
});

describe('finding 4: regulation 13 is stated before the challenge', () => {
  it('the Child Benefit letter concedes what is permitted, then asks the real question', () => {
    const letter = generateLetter('challenge-child-benefit-deduction', ctx());
    expect(letter.body).toMatch(/regulations allow Child Benefit to be taken into account/);
    expect(letter.body).toMatch(/how that was decided in my case/);
    expect(letter.citations.map((c) => c.id)).toContain('sg-regs-2005-reg13');
  });
});

describe('the defects', () => {
  it('the breakdown letter never refers to a figure it has not given', () => {
    // It used to say "how that figure was calculated" whenever the carer had
    // given an amount. The only amount it can quote is the OLD fostering
    // allowance, and the breakdown being asked for is of the CURRENT one, so
    // the demonstrative pointed at the wrong number. Now it names neither.
    for (const paid of [pence(12000), undefined]) {
      const body = generateLetter(
        'request-calculation-breakdown',
        ctx({ previousFosteringWeekly: paid }),
      ).body;
      expect(body).toMatch(/how my allowance was calculated/);
      expect(body).not.toMatch(/that figure/);
    }
  });

  it('no letter claims the carer currently receives their old fostering rate', () => {
    // The figure is what they were paid as a foster carer BEFORE the order. A
    // former foster carer may now be receiving nothing, so "I currently
    // receive X" was a false sentence the council could correct on the spot.
    for (const t of ALL) {
      const body = generateLetter(t, ctx({ previousFosteringWeekly: pence(12000) })).body;
      expect(body, t).not.toMatch(/I currently receive/);
      if (body.includes('£120')) {
        expect(body, t).toMatch(/Before the order was made I was paid/);
      }
    }
  });

  it('no letter refers to a conditional sentence that may be absent', () => {
    // The general form of the defect above: a demonstrative pointing at a
    // sentence that only appears for some carers.
    for (const t of ALL) {
      const sparse = generateLetter(
        t,
        ctx({ previousFosteringWeekly: undefined, councilName: undefined, onMeansTestedBenefits: false }),
      ).body;
      expect(sparse, `${t} refers to a figure it never gave`).not.toMatch(/that figure|that amount/);
    }
  });
});

describe('the rules that must survive future edits', () => {
  it.each(ALL)('%s asks rather than demands, and cites something', (t) => {
    const letter = generateLetter(t, ctx());
    expect(letter.citations.length, 'every letter states a position').toBeGreaterThan(0);
    expect(letter.body).not.toMatch(/I am entitled to|I demand|you must immediately|unlawful/i);
    // No self-imposed deadline: a date the carer sets can only be missed.
    expect(letter.body).not.toMatch(/within \d+ (working )?days|by \[?DATE\]? at the latest/i);
  });

  it('every letter says which council to send it to', () => {
    for (const t of ALL) {
      const text = letterAsPlainText(generateLetter(t, ctx()));
      expect(text, `${t} does not say who to send it to`).toMatch(
        /the council that looked after the child/,
      );
      expect(text).toMatch(/which-council-is-responsible/);
    }
  });

  it('the fostering figure is attributed, not asserted as ours', () => {
    const body = generateLetter('challenge-fixed-percentage', ctx()).body;
    expect(body).toMatch(/published by the Department for Education/);
  });
});
