import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility statement',
  description: 'How accessible this site is, what I test, and what to do if something does not work for you.',
  alternates: { canonical: '/accessibility' },
};

export default function AccessibilityPage() {
  return (
    <>
      <h1>Accessibility statement</h1>

      <p className="big">
        I built this for grandparents and other relatives in their fifties, sixties and seventies. I
        do not measure who actually visits, so that is the audience I designed for and not something
        I have counted. Accessibility here is the core use case, not a compliance exercise.
      </p>

      <h2>What I aim for</h2>
      <p>
        I aim to meet <strong>WCAG 2.2 Level AA</strong> on every page, and I exceed it in a few
        places where it matters for this audience.
      </p>
      <ul>
        <li>Body text is 18px, never below 16px anywhere, including footnotes and disclaimers.</li>
        <li>Body text contrast is at least 7:1, which is the AAA threshold rather than AA&apos;s 4.5:1.</li>
        <li>The site works at 200% zoom, and at 320px wide, with no sideways scrolling.</li>
        <li>Every button and link is at least 48×48 pixels, with space around it.</li>
        <li>Focus outlines are always visible and are never removed.</li>
        <li>Everything works with a keyboard alone. There are no keyboard traps and no time limits.</li>
        <li>Money fields are plain text fields, not number spinners, which are awkward with a screen reader and with shaky hands.</li>
        <li>The site respects your system setting for reduced motion. Nothing moves or advances on its own.</li>
      </ul>

      <h2>How I test</h2>
      <p>
        Automated accessibility checks run against every page each time I change the site, and a failure stops the change being published. I also test by keyboard alone, and with screen readers.
      </p>

      <h2>Without JavaScript</h2>
      <p>
        Every guide and every rate table works with JavaScript switched off. The calculator itself
        needs it, and says so. But the figures it would have shown you are on the{' '}
        <a href="/rates">rates page</a> as plain tables.
      </p>

      <h2>Known limitations</h2>
      <ul>
        <li>
          The council picker is a long list. If a searchable version would help you, please tell me. I would rather hear about it than guess.
        </li>
        <li>
          Printed output is designed for A4 and US Letter. Very small paper sizes may cut off wide
          tables.
        </li>
      </ul>

      <h2>If something does not work</h2>
      <p>
        Please <a href="/contact">tell me</a>. Say what you were trying to do and what happened.
        Accessibility problems go to the top of my list, and I will tell you what I am doing
        about it.
      </p>
    </>
  );
}
