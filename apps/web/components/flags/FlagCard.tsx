import type { Flag } from '@sgo/engine';
import { SourceLink } from '../ui/SourceLink';
import { Markdown } from '../ui/Markdown';

/**
 * One point, set as prose rather than as a card.
 *
 * The severity is carried by the section heading above (see FlagList), so this
 * needs no chip, no icon and no border of its own. What is left is what a reader
 * actually wants: a bold line saying what the point is, the explanation indented
 * under it, and the source.
 *
 * Kept in a file still named FlagCard.tsx so the print stylesheet's `.flag-card`
 * page-break rule keeps working; the class is applied below for that reason.
 */
export function FlagItem({ flag }: { flag: Flag }) {
  return (
    <div className="flag-item flag-card avoid-break">
      <h4 className="flag-item__title">{flag.title}</h4>
      <div className="flag-item__body">
        <Markdown>{flag.body}</Markdown>
        {flag.citation && (
          <p className="flag-item__source">
            Source: <SourceLink citation={flag.citation} />
          </p>
        )}
        {flag.actionUrl && (
          <p className="flag-item__action">
            <a href={flag.actionUrl}>Read more about this</a>
          </p>
        )}
      </div>
    </div>
  );
}
