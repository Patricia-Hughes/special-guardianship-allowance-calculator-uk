'use client';

import { useCallback, useEffect, useState } from 'react';

export type CopyState = 'idle' | 'done' | 'failed';

/**
 * Copy text, and always say what happened.
 *
 * Both copy buttons on this site were written the same wrong way: a refused
 * clipboard set the flag back to false, and the status line rendered nothing,
 * so the button appeared to do absolutely nothing. That is the worst possible
 * answer on a page whose whole job is handing a carer something to send. It was
 * fixed once, in the letters, and left standing in the share control, which is
 * why the logic now lives in one place instead of two.
 *
 * The clipboard is refused more often than it looks: an insecure origin, a
 * locked-down browser, or a device that simply does not grant it. None of that
 * is the carer's fault and none of it should look like a broken page.
 */
export function useCopyToClipboard(): { state: CopyState; copy: (text: string) => void } {
  const [state, setState] = useState<CopyState>('idle');

  // Clear the confirmation after a while, so it belongs to the press that
  // caused it rather than sitting there for the rest of the session.
  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 8000);
    return () => clearTimeout(t);
  }, [state]);

  const copy = useCallback((text: string): void => {
    const writer = navigator.clipboard?.writeText(text);
    if (!writer) {
      setState('failed');
      return;
    }
    void writer.then(
      () => setState('done'),
      () => setState('failed'),
    );
  }, []);

  return { state, copy };
}
