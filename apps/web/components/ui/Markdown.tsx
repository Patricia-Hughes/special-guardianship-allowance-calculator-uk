import type { ReactNode } from 'react';

/**
 * A deliberately tiny Markdown renderer for flag bodies.
 *
 * Flag copy is authored in this repository, reviewed alongside the legal copy,
 * and uses only paragraphs, bold and inline links. Pulling in a full Markdown
 * pipeline for that would cost more than the calculator route's entire JS
 * budget (§31) and would add an HTML-injection surface for no gain.
 *
 * It renders text as text: nothing here interprets raw HTML.
 */
export function Markdown({ children }: { children: string }) {
  const paragraphs = children.split('\n\n').filter((p) => p.trim().length > 0);
  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ margin: i === paragraphs.length - 1 ? 0 : '0 0 0.75rem' }}>
          {inline(para)}
        </p>
      ))}
    </>
  );
}

/** Handles **bold** only; everything else is literal text. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  parts.forEach((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      out.push(<strong key={i}>{part.slice(2, -2)}</strong>);
    } else if (part.length > 0) {
      out.push(part);
    }
  });
  return out;
}
