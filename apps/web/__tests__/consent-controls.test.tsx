import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConsentBanner } from '../components/ui/ConsentBanner';
import { ConsentControls } from '../components/ui/ConsentControls';
import { writeConsent } from '../lib/analytics';

beforeEach(() => {
  writeConsent('unset');
  window.SGO_GOOGLE_CONFIG = { ga4MeasurementId: 'G-TEST123456' };
  document.getElementById('ga-tag')?.remove();
  delete window.dataLayer;
  delete window.gtag;
});
afterEach(cleanup);

it('updates the banner and privacy controls together and permits yes, no, then yes', () => {
  render(
    <>
      <ConsentBanner />
      <ConsentControls />
    </>
  );
  expect(screen.getByRole('region', { name: 'Cookies on this site' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Turn analytics on' }));
  expect(screen.queryByRole('region', { name: 'Cookies on this site' })).toBeNull();
  expect(screen.getByText(/You have said yes to analytics cookies/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Turn analytics off' }));
  expect(screen.getByText(/You have said no to analytics cookies/)).toBeTruthy();
  expect((window as unknown as Record<string, unknown>)['ga-disable-G-TEST123456']).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Turn analytics on' }));
  expect((window as unknown as Record<string, unknown>)['ga-disable-G-TEST123456']).toBe(false);
  expect(document.querySelectorAll('#ga-tag')).toHaveLength(1);
});

it('shows an accurate off status and no consent prompt while the ID is a placeholder', () => {
  window.SGO_GOOGLE_CONFIG = {
    ga4MeasurementId: 'REPLACE_WITH_YOUR_GA4_MEASUREMENT_ID',
  };
  render(
    <>
      <ConsentBanner />
      <ConsentControls />
    </>
  );
  expect(screen.queryByRole('region', { name: 'Cookies on this site' })).toBeNull();
  expect(screen.getByText('Analytics are currently off on this site.')).toBeTruthy();
  expect(document.getElementById('ga-tag')).toBeNull();
});
