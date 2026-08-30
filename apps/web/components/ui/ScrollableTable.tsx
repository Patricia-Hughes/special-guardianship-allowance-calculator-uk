import type { ReactNode } from 'react';

/**
 * A horizontally scrollable container for a wide table.
 *
 * The page body must never scroll sideways (§24), so wide content scrolls
 * inside its own container. A scrollable container must be keyboard-operable —
 * otherwise someone navigating without a mouse can see that a table continues
 * off-screen and has no way to reach the rest of it. Hence tabIndex and an
 * accessible name.
 */
export function ScrollableTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="scroll-x" tabIndex={0} role="group" aria-label={label}>
      {children}
    </div>
  );
}
