/**
 * Feature flags and rollout — spec §39.
 *
 * Phase 1 (launch): England, Scotland and NI. Maximum-only calculation. All
 * guidance pages except Wales. Print/PDF export. No means test, no backdating,
 * no LA pages.
 *
 * That is already better than anything currently available. A carer who learns
 * their council's lawful ceiling and can print it has what they need. Do NOT
 * hold Phase 1 for Phase 2 data.
 */

export interface FeatureFlags {
  /**
   * Unblocked 30 Aug 2026: the DWP Income Support applicable amounts are
   * sourced for both years from 'Benefit and pension rates 2026 to 2027'.
   * Every result using it still carries MEANS_TEST_MODEL_OUTDATED and
   * TAPER_METHOD_ASSUMED — the model is non-statutory and the taper is still
   * only corroborated across three councils.
   */
  MEANS_TEST_ENABLED: boolean;
  /**
   * Unblocked 30 Aug 2026. The 2024/25 England table was recovered from the
   * National Archives snapshot of the GOV.UK page, as published rather than
   * back-calculated. Wales, Scotland and NI have no 2024/25 data, so that year
   * blocks for them instead of throwing.
   */
  BACKDATING_ENABLED: boolean;
  /**
   * Unblocked 30 Aug 2026. The Welsh 0–4 > 5–15 inversion is real, not a
   * transcription error: it reproduces in the 2025/26 figures and the
   * announced 2.2% uplift regenerates our table to the pound. The Welsh
   * Government's own circular is still outstanding, so the rates keep
   * verify: true and carry anomalyConfirmed with an on-screen explanation.
   */
  WALES_ROUTE_ENABLED: boolean;
  /**
   * Unblocked 3 September 2026. The letters existed, tested and legally
   * reviewed, but nothing rendered them, so no carer could reach one. The
   * screen is built: it lists the letters that match the warnings that fired,
   * fills each with the carer's own figures, and offers copy and download. It
   * sends nothing and saves nothing.
   */
  LETTER_GENERATOR: boolean;
  POSTCODE_LOOKUP: boolean;
  KINSHIP_ZONE_PATH: boolean;
  /** Phase 3. */
  WELSH_LANGUAGE: boolean;
  /** Blocked on legal review of the page template (spec §29.4). */
  LA_PAGES: boolean;
}

export const FLAGS: FeatureFlags = {
  MEANS_TEST_ENABLED: true,
  BACKDATING_ENABLED: true,
  WALES_ROUTE_ENABLED: true,
  LETTER_GENERATOR: true,
  POSTCODE_LOOKUP: true,
  KINSHIP_ZONE_PATH: true,
  WELSH_LANGUAGE: false,
  LA_PAGES: false,
};
