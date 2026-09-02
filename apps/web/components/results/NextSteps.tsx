import type { CalculatorResult } from '@sgo/engine';

/**
 * Five numbered steps, each linking to the relevant guidance page (spec §21
 * item 6). The steps adapt to what actually fired, so a former foster carer and
 * a first-time special guardian do not get the same list.
 */
export function NextSteps({ result }: { result: CalculatorResult }) {
  const has = (code: string): boolean => result.flags.some((f) => f.code === code);
  const scotland = result.regime === 'scotland-kinship';

  const steps: Array<{ title: string; body: string; href: string }> = [];

  steps.push({
    title: 'Ask for your council’s written policy',
    // Was "Councils must have a published policy", with nothing behind it. The
    // same sentence was removed from the COUNCIL_POLICY_UNKNOWN warning after
    // the legal review of 1 September; this copy of it lives on the result page
    // and so was not in the packs the reviewer was given. What is on record is
    // the October 2024 duty to publish a kinship local offer.
    body: 'Every council in England has to publish a kinship local offer setting out the support it provides, and most publish a financial support policy as well. It is the document every later question rests on.',
    href: '/guidance/asking-for-the-policy',
  });

  steps.push({
    title: 'Ask for the calculation in writing',
    body: 'Ask how your figure was worked out: the starting point, what income counted, what outgoings were allowed, and every deduction with its reason.',
    href: scotland ? '/guidance/scotland-kinship-care' : '/guidance/how-the-means-test-works',
  });

  if (has('UNLAWFUL_CB_DEDUCTION_RISK')) {
    steps.push({
      title: 'Query the Child Benefit deduction',
      // The regulations permit the deduction. Saying only that the Ombudsman
      // found one wrong points the carer at a question they cannot win.
      body: 'The regulations allow a council to take Child Benefit into account, so the question is not whether yours may. It is whether it decided your case individually. The Ombudsman found a council at fault for applying the same rule to everybody.',
      href: '/guidance/child-benefit-deduction',
    });
  }

  if (has('REG7_FLOOR_APPLIED') || has('REG7_EXPIRING') || has('REG7_EXTENSION_AVAILABLE')) {
    steps.push({
      title: 'Ask about the two-year point',
      body: 'As a former foster carer, your council can carry on paying the reward part of your fostering allowance for two years, and for longer if it considers that appropriate. Nothing about that is automatic in either direction, so it is worth asking.',
      href: '/guidance/former-foster-carers',
    });
  }

  if (has('ENHANCEMENT_AVAILABLE')) {
    steps.push({
      title: "Ask for more because of your child's needs",
      body: 'There is no national figure for this, so it will not appear in any estimate. But the regulations allow it and you have to ask.',
      href: '/guidance/enhancements-for-additional-needs',
    });
  }

  if (has('KINSHIP_ZONE_ELIGIBLE') || has('KINSHIP_ZONE_EXCLUDED_REG6')) {
    steps.push({
      title: 'Ask whether the Kinship Zones pilot applies to you',
      body: 'Your council is one of seven in the pilot. The pilot rate is not means tested.',
      href: '/guidance/kinship-zones',
    });
  }

  steps.push({
    title: 'Print this page and take it with you',
    body: 'A printed page with the figures, the arithmetic and the sources on it is far harder to wave away than a conversation.',
    href: '#print',
  });

  steps.push({
    title: 'If you get nowhere, complain, then go to the Ombudsman',
    body: 'Use your council’s complaints procedure first. If you are still not satisfied, the Ombudsman can look at it, and has ordered councils to backdate payments.',
    href: '/guidance/complaining-to-the-ombudsman',
  });

  return (
    <section aria-labelledby="next-steps-heading" className="avoid-break">
      <h2 id="next-steps-heading">What to do next</h2>
      <ol>
        {steps.slice(0, 6).map((s, i) => (
          <li key={i} style={{ marginBottom: '1rem' }}>
            <strong>{s.title}</strong>
            <div>{s.body}</div>
            {!s.href.startsWith('#') && <a href={s.href}>Read the guide</a>}
          </li>
        ))}
      </ol>
    </section>
  );
}
