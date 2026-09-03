/**
 * The stale-rates banner has to read the CARER's clock, not the build's.
 *
 * This is a static export. The old banner asked `todayUtc()` inside a server
 * component, so the answer was decided when the site was built and frozen into
 * the HTML forever. The situation it exists for is a site left up across an
 * April boundary with nobody rebuilding it, and that is exactly the situation a
 * build-time check cannot see: the HTML never changes, so the comparison never
 * runs again. The banner was dead code in every real deployment.
 *
 * These tests move the clock, not the build.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StaleWatch } from '../components/ui/StaleWatch';

const DEADLINE = '2027-03-31';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const at = (iso: string): void => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${iso}T12:00:00Z`));
};

describe('the stale-rates banner', () => {
  it('warns a reader whose own date is past the deadline, on a site built long before', () => {
    // The whole point: staleAtBuildTime is false, because the site was built
    // while the rates were current. The reader arrives a year later.
    at('2027-06-01');
    render(<StaleWatch effectiveTo={DEADLINE} staleAtBuildTime={false} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/These rates may be out of date/);
    expect(screen.getByRole('alert')).toHaveTextContent(DEADLINE);
  });

  it('says nothing while the rates are still current', () => {
    at('2026-09-03');
    render(<StaleWatch effectiveTo={DEADLINE} staleAtBuildTime={false} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows on the very next day, not a month later', () => {
    at('2027-04-01');
    render(<StaleWatch effectiveTo={DEADLINE} staleAtBuildTime={false} />);
    expect(screen.queryByRole('alert')).not.toBeNull();
  });

  it('is still in the markup with no JavaScript when the build was already stale', () => {
    // staleAtBuildTime is the server's answer, and it has to survive as the
    // initial state or the banner would flash away before hydration for the
    // one reader who has scripting off.
    at('2027-06-01');
    render(<StaleWatch effectiveTo={DEADLINE} staleAtBuildTime={true} />);
    expect(screen.queryByRole('alert')).not.toBeNull();
  });

  it('catches a tab left open across the boundary', () => {
    at('2027-03-31');
    render(<StaleWatch effectiveTo={DEADLINE} staleAtBuildTime={false} />);
    expect(screen.queryByRole('alert')).toBeNull();

    // Someone leaves the page up overnight. The rates expire under them.
    vi.setSystemTime(new Date('2027-04-01T12:00:00Z'));
    // act, because the state change comes from the interval rather than from
    // anything the test renders.
    act(() => void vi.advanceTimersByTime(60 * 60 * 1000));
    expect(screen.queryByRole('alert')).not.toBeNull();
  });
});
