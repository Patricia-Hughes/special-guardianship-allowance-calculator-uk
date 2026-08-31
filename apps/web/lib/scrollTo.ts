/**
 * Moving someone to the part of the page that just changed.
 *
 * The form grows and shrinks under you: a step replaces another, a child row
 * appears below the fold, a result arrives further down than the button you
 * pressed. Without this, the page silently changes somewhere you are not
 * looking, and on a phone that means it appears to have done nothing at all.
 *
 * Two rules it keeps:
 *
 *  1. Focus first, scrolling second. Focus is what a screen reader and a
 *     keyboard follow, and it is the thing that must not be lost. `focus` is
 *     called with preventScroll so the browser's own jump does not fight the
 *     smooth scroll.
 *  2. `prefers-reduced-motion` is honoured. A smooth scroll is unpleasant, and
 *     for some people genuinely unwell-making, when motion is turned down. Those
 *     users still get taken to the right place, just instantly.
 */

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Bring an element into view, and optionally put focus on it.
 *
 * `block: 'start'` with scroll-margin-top in the stylesheet keeps the heading
 * clear of the sticky banner rather than tucked underneath it.
 */
export function scrollToElement(
  el: HTMLElement | null | undefined,
  opts: { focus?: boolean } = {},
): void {
  if (!el) return;

  if (opts.focus) {
    // preventScroll is not universal; where it is missing the browser jumps and
    // the smooth scroll below simply refines it, which is still correct.
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }

  el.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
    inline: 'nearest',
  });
}

/**
 * The same, once the browser has actually painted the new markup.
 *
 * React commits before layout is settled, so scrolling to a row that was added
 * in the same render can land at the wrong offset. A double frame is enough for
 * the element to have its final position.
 */
export function scrollToElementAfterPaint(
  get: () => HTMLElement | null | undefined,
  opts: { focus?: boolean } = {},
): void {
  if (typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => scrollToElement(get(), opts));
  });
}
