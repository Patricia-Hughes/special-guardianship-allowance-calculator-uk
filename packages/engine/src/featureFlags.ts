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
  /** Blocked on the DWP Income Support applicable amounts (spec §8.4). */
  MEANS_TEST_ENABLED: boolean;
  /** Blocked on 2024/25 rate data (spec §8.3). */
  BACKDATING_ENABLED: boolean;
  /** Blocked on the Welsh 0–4 vs 5–15 verification (spec §8.1). */
  WALES_ROUTE_ENABLED: boolean;
  /** Phase 2. */
  LETTER_GENERATOR: boolean;
  POSTCODE_LOOKUP: boolean;
  KINSHIP_ZONE_PATH: boolean;
  /** Phase 3. */
  WELSH_LANGUAGE: boolean;
  /** Blocked on legal review of the page template (spec §29.4). */
  LA_PAGES: boolean;
}

export const FLAGS: FeatureFlags = {
  MEANS_TEST_ENABLED: false,
  BACKDATING_ENABLED: false,
  WALES_ROUTE_ENABLED: false,
  LETTER_GENERATOR: false,
  POSTCODE_LOOKUP: true,
  KINSHIP_ZONE_PATH: true,
  WELSH_LANGUAGE: false,
  LA_PAGES: false,
};
