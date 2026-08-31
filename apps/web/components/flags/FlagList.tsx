import type { Flag, FlagSeverity } from '@sgo/engine';
import { FlagItem } from './FlagCard';

/**
 * One heading, then sections under it.
 *
 * Every flag used to be its own bordered card. A typical result raises seven or
 * eight, most of them informational, so the page became a stack of near
 * identical boxes each shouting WORTH KNOWING, and the two that genuinely
 * mattered were lost among them. Emphasis applied everywhere is emphasis
 * nowhere.
 *
 * Now the severity is a section heading, said once, and the items below it read
 * as ordinary prose. §23 forbids signalling severity by colour alone; the
 * heading carries it in words, which is a stronger guarantee than the coloured
 * chip it replaces.
 *
 * Flags arrive already sorted by the engine (critical, important, info, then by
 * financial impact within a severity). This does not re-sort them: the ordering
 * is a legal-content decision, made once, in the engine.
 */
const GROUPS: Array<{ severity: FlagSeverity; heading: string; blurb: string }> = [
  {
    severity: 'critical',
    heading: 'Check these first',
    blurb: 'These are the points where councils have most often been found wrong.',
  },
  {
    severity: 'important',
    heading: 'Worth raising',
    blurb: 'Ask your council about these when you write to it.',
  },
  {
    severity: 'info',
    heading: 'Worth knowing',
    blurb: 'Background that may matter to your case.',
  },
];

export function FlagList({ flags }: { flags: Flag[] }) {
  if (flags.length === 0) return null;

  return (
    <section aria-labelledby="flags-heading">
      <h2 id="flags-heading">What to check with your council</h2>

      {GROUPS.map(({ severity, heading, blurb }) => {
        const inGroup = flags.filter((f) => f.severity === severity);
        if (inGroup.length === 0) return null;
        return (
          <div key={severity} className={`flag-group flag-group--${severity}`}>
            <h3 className="flag-group__heading">{heading}</h3>
            <p className="flag-group__blurb">{blurb}</p>
            {inGroup.map((f) => (
              <FlagItem key={f.code} flag={f} />
            ))}
          </div>
        );
      })}
    </section>
  );
}
