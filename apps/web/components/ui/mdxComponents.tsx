import { cite } from '@sgo/engine';
import { RateTable } from './RateTable';
import { Callout } from './Callout';
import { AdviceLines } from './AdviceLines';
import { BenefitAmount } from './BenefitAmount';
import { SourceLink } from './SourceLink';

/**
 * Components available inside MDX — spec §26.
 *
 * <RateTable /> is why the CI check on hardcoded money in MDX exists: when the
 * April uprating lands, every figure on the site updates at once. A writer who
 * types "£255" into prose ships a number that silently goes wrong every April.
 */
export function Cite({ id }: { id: string }) {
  return <SourceLink citation={cite(id)} />;
}

export function LetterCTA({ template }: { template: string }) {
  return (
    <div className="callout">
      <p className="flush">
        <strong>There is a template letter for this.</strong> It is written and checked but not
        switched on yet, so for now the wording you need is in the guidance above.
        <span className="sr-only"> Template: {template}</span>
      </p>
    </div>
  );
}

export function CalculatorCTA() {
  return (
    <div className="callout">
      <p className="flush">
        <strong>
          <a href="/">Work out what your council should be paying you</a>
        </strong>{' '}
        It takes under a minute, and nothing you type leaves your browser.
      </p>
    </div>
  );
}

export const mdxComponents = {
  RateTable,
  Cite,
  Callout,
  LetterCTA,
  CalculatorCTA,
  AdviceLines,
  BenefitAmount,
};
