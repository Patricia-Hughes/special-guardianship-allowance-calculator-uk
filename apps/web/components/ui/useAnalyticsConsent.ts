'use client';

import { useEffect, useState } from 'react';
import {
  disableAnalytics,
  getMeasurementId,
  loadAnalytics,
  readConsent,
  subscribeToConsent,
  writeConsent,
  type Consent,
} from '../../lib/analytics';

export function useAnalyticsConsent() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const synchronize = (): void => {
      const available = getMeasurementId() !== '';
      const choice = readConsent();
      setConfigured(available);
      setConsent(choice);
      if (available && choice === 'granted') loadAnalytics();
      else disableAnalytics();
    };
    synchronize();
    return subscribeToConsent(synchronize);
  }, []);

  return { consent, configured, answer: writeConsent };
}
