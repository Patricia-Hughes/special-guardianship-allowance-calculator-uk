/** Domain types — spec §7. Vocabulary is defined in spec §3 and is not interchangeable. */

import type { Pence } from './money.js';

export type { Pence };

// ─── Primitives ────────────────────────────────────────────────────────────

export type Nation = 'england' | 'wales' | 'scotland' | 'northern-ireland';
export type EnglandRegion = 'london' | 'south-east' | 'rest-of-england';
export type Regime =
  | 'england-sgo'
  | 'wales-sgo'
  | 'ni-sgo'
  | 'scotland-kinship'
  | 'kinship-zone';

/** ISO date string, YYYY-MM-DD. */
export type IsoDate = string & { readonly __brand: 'IsoDate' };

// ─── Inputs ────────────────────────────────────────────────────────────────

export interface ChildInput {
  id: string;
  /** 0–17 inclusive. Ignored when `dateOfBirth` is given. */
  ageYears: number;
  /** Preferred; derives age at a given date, which matters for backdating. */
  dateOfBirth?: IsoDate;
  hasDisabilityOrAdditionalNeeds: boolean;
  wasLookedAfterImmediatelyBeforeOrder: boolean | 'unknown';
  /** Drives which Child Benefit rate would apply. */
  isEldestInHousehold: boolean;
}

export type MeansTestedBenefit =
  | 'universal-credit'
  | 'income-support'
  | 'jsa-income-based'
  | 'esa-income-related'
  | 'pension-credit'
  | 'housing-benefit'
  | 'council-tax-support';

export interface CarerInput {
  nation: Nation;
  /** Required iff nation === 'england'. */
  englandRegion?: EnglandRegion;
  /** Unlocks LA override + Kinship Zone check. */
  localAuthoritySlug?: string;
  wasFosterCarerForThisChild: boolean;
  /** Preferred over monthsSinceOrderMade. */
  orderDate?: IsoDate;
  monthsSinceOrderMade: number;
  previousWeeklyFosteringAllowance?: Pence;
  /** UC / IS / JSA(IB) / ESA(IR) / Pension Credit. */
  onMeansTestedBenefits: boolean;
  /** For flag generation only. */
  meansTestedBenefitsHeld?: MeansTestedBenefit[];
  /** Kinship Zone eligibility. */
  childWouldOtherwiseBeInCare?: boolean;
  /** Kinship Zone exclusion. */
  alreadyReceivingReg6Support?: boolean;
}

/** All MONTHLY, net, in pence. Except savingsCapital, which is a total. */
export interface FinancesInput {
  netEarnings: Pence;
  /** Pensions, maintenance received, lodgers. */
  otherIncome: Pence;
  /** See spec §14.1 — EXCLUDES disregarded items. */
  countableBenefits: Pence;
  childBenefitOtherChildren: Pence;
  /** Total, not monthly. */
  savingsCapital: Pence;
  /** Rent after HB, or mortgage capital + interest. */
  housingCosts: Pence;
  /** After council tax support. */
  councilTax: Pence;
  /** After any childcare element. */
  childcareCosts: Pence;
  essentialLoanRepayments: Pence;
  maintenancePaid: Pence;
  pensionContributions: Pence;
  adultsInHousehold: number;
  dependentChildrenInHousehold: number;
  /** Affects the Income Support applicable amount. */
  householdHasDisabilityPremium?: boolean;
  /** Affects the Income Support applicable amount. */
  householdHasCarerPremium?: boolean;
  /** Affects the Income Support applicable amount (single claimants only). */
  claimantUnder25?: boolean;
}

export interface CalculatorInput {
  carer: CarerInput;
  children: ChildInput[];
  /** Omit → maximum only. */
  finances?: FinancesInput;
  /** DEFAULT FALSE. See rule R2. */
  applyChildBenefitDeduction: boolean;
  taperOverride?: TaperConfig;
  /** Defaults to today (UTC); drives rate-table selection. */
  asAtDate?: IsoDate;
}

// ─── Configuration ─────────────────────────────────────────────────────────

export interface TaperConfig {
  method: 'pound-for-pound' | 'percentage' | 'threshold';
  /** 0–1, used when method === 'percentage'. */
  percentage?: number;
  thresholdMonthly?: Pence;
}

export interface CapitalConfig {
  thresholdPence: Pence;
  tariffPerBlockPence: Pence;
  blockSizePence: Pence;
  period: 'weekly' | 'monthly';
  enabled: boolean;
}

// ─── Outputs ───────────────────────────────────────────────────────────────

export type FloorReason =
  | 'reg7-former-foster-carer'
  | 'kinship-zone-nma'
  | 'scottish-recommended-allowance';

export interface Citation {
  /** Key into citations.json. */
  id: string;
  label: string;
  url: string;
  retrieved: IsoDate;
  kind: 'statute' | 'regulation' | 'guidance' | 'case' | 'ombudsman' | 'dataset';
  /** Rendered verbatim in the UI where present — this is content, not a comment. */
  holding?: string;
  note?: string;
  /** Set when the source URL has not been re-sourced yet. UI must not render a dead link. */
  pendingSourceIssue?: string;
  /**
   * The original address, where `url` deliberately points at an archived copy
   * because the original no longer responds. The reader is told, rather than
   * left to wonder why they have landed on the web archive.
   */
  archivedFrom?: string;
}

export interface PerChildResult {
  childId: string;
  ageBand: string;
  ageAtCalculation: number;
  coreAllowanceWeekly: Pence;
  enhancementWeekly: Pence;
  maximumWeekly: Pence;
  assessedContributionWeekly: Pence;
  childBenefitDeductionWeekly: Pence;
  estimatedAllowanceWeekly: Pence;
  floorApplied: FloorReason | null;
  citations: Citation[];
}

export interface BreakdownStep {
  label: string;
  operation: 'add' | 'subtract' | 'multiply' | 'result';
  valuePence: Pence;
  runningTotalPence: Pence;
  note?: string;
}

export interface MeansTestBreakdown {
  totalCountableIncomeMonthly: Pence;
  /** 0.20 */
  disregardRate: number;
  incomeAfterDisregardMonthly: Pence;
  coreLivingCostsMonthly: Pence;
  /** 1.25 */
  coreLivingCostsMultiplier: number;
  totalExpenditureMonthly: Pence;
  disposableIncomeMonthly: Pence;
  capitalTariffMonthly: Pence;
  taperMethod: TaperConfig['method'];
  assessedContributionMonthly: Pence;
  assessedContributionWeekly: Pence;
  /** For the "show the arithmetic" panel. */
  steps: BreakdownStep[];
}

export type FlagCode =
  | 'UNLAWFUL_CB_DEDUCTION_RISK'
  | 'FIXED_PERCENTAGE_POLICY'
  | 'BELOW_NMA'
  | 'LGSCO_FINDING_AGAINST_LA'
  | 'REG7_FLOOR_APPLIED'
  | 'REG7_EXPIRING'
  | 'REG7_EXTENSION_AVAILABLE'
  | 'REG7_MISAPPLICATION_WARNING'
  | 'NOT_LOOKED_AFTER_BEFORE_ORDER'
  | 'LOOKED_AFTER_STATUS_UNKNOWN'
  | 'KINSHIP_ZONE_ELIGIBLE'
  | 'KINSHIP_ZONE_EXCLUDED_REG6'
  | 'ENHANCEMENT_AVAILABLE'
  | 'MEANS_TEST_MODEL_OUTDATED'
  | 'TAPER_METHOD_ASSUMED'
  | 'CAPITAL_RULE_MAY_APPLY'
  | 'ANNUAL_REVIEW_DUE'
  | 'THREE_YEAR_RESPONSIBILITY'
  | 'AGE_17_TRANSITION'
  | 'BENEFIT_CAP_RISK'
  | 'TWO_CHILD_LIMIT_ABOLISHED'
  | 'GUARDIANS_ALLOWANCE_CHECK'
  | 'RATES_STALE'
  | 'COUNCIL_POLICY_UNKNOWN'
  | 'SCOTLAND_SRA_IS_A_FLOOR'
  | 'SCOTLAND_FOSTER_KINSHIP_PARITY'
  | 'SCOTLAND_NO_WORSE_OFF'
  | 'KINSHIP_ZONE_PILOT_CAVEAT'
  | 'KINSHIP_ZONE_COMPARISON'
  | 'WALES_BAND_ORDER_ANOMALY'
  | 'APRIL_RATE_BOUNDARY'
  | 'LGSCO_FINDING_FORMER_POLICY'
  | 'LA_LIVING_COSTS_VARIATION'
  | 'LA_POLICY_UNDER_REVIEW';

export type FlagSeverity = 'info' | 'important' | 'critical';

export interface Flag {
  code: FlagCode;
  severity: FlagSeverity;
  title: string;
  /** Markdown. */
  body: string;
  citation?: Citation;
  /** Link to a guidance page or the letter generator. */
  actionUrl?: string;
}

export interface CalculatorResult {
  regime: Regime;
  /** '2026-27' */
  financialYear: string;
  ratesEffectiveFrom: IsoDate;
  perChild: PerChildResult[];
  totalWeekly: Pence;
  totalAnnual: Pence;
  meansTestApplied: boolean;
  meansTestBreakdown?: MeansTestBreakdown;
  flags: Flag[];
  warnings: string[];
  /** ISO datetime. */
  computedAt: string;
  engineVersion: string;
  dataVersion: string;
}

// ─── Reference data shapes ─────────────────────────────────────────────────

export interface AgeBand {
  id: string;
  minAge: number;
  maxAge: number;
}

export interface RegionalRates {
  sourceId: string;
  unit: 'weekly-pence';
  upliftPercent?: number;
  note?: string;
  ageBands: AgeBand[];
  regions: Record<EnglandRegion, Record<string, number>>;
}

export interface FlatNationRates {
  sourceId: string;
  unit: 'weekly-pence';
  upliftPercent?: number;
  note?: string;
  verify?: boolean;
  verifyNote?: string;
  /**
   * A figure that looks like an error but has been corroborated as genuinely
   * published. Distinct from `verify`, which means "suspect, do not serve".
   * Set, the route may ship — with an on-screen explanation, because a rate
   * that looks wrong reads as a bug in the site unless we say otherwise.
   */
  anomalyConfirmed?: boolean;
  anomalyConfirmedOn?: string;
  anomalyCorroboration?: Array<{ source: string; url: string; date?: string; finding: string }>;
  userFacingNote?: string;
  ageBands: AgeBand[];
  rates: Record<string, number>;
}

export interface RateTable {
  financialYear: string;
  /** Council convention: 1 April. This is the operative window — see aprilBoundaryNote. */
  effectiveFrom: IsoDate;
  effectiveTo: IsoDate;
  /** DfE states the NMA on a tax year, 6 April to 5 April. Differs from the above. */
  dfeStatedTaxYearFrom?: IsoDate;
  dfeStatedTaxYearTo?: IsoDate;
  /** The date councils actually apply the uplift from. Same as effectiveFrom. */
  councilApplicationFrom?: IsoDate;
  aprilBoundaryNote?: string;
  dataVersion: string;
  status?: 'PENDING_SOURCE';
  pendingSourceIssue?: string;
  note?: string;
  england?: RegionalRates | null;
  wales?: FlatNationRates | null;
  'northern-ireland'?: FlatNationRates | null;
  scotland?: FlatNationRates | null;
}

export interface IncomeSupportApplicableAmounts {
  status: 'PENDING_SOURCE' | 'SOURCED';
  pendingSourceIssue?: string;
  sourceId?: string;
  note?: string;
  schema: {
    singleUnder25Pence: number | null;
    single25PlusPence: number | null;
    couplePence: number | null;
    dependentChildPence: number | null;
    familyPremiumPence: number | null;
    /** The single rate. DWP publishes a separate, higher couple rate. */
    disabilityPremiumPence: number | null;
    /** Optional: pre-dates the couple rate being sourced. Falls back to the single rate. */
    disabilityPremiumCouplePence?: number | null;
    carerPremiumPence: number | null;
  };
  /** Published in the same table, recorded for future use, not read by the engine. */
  sourcedButUnused?: Record<string, unknown>;
}

export interface BenefitTable {
  financialYear: string;
  effectiveFrom: IsoDate;
  dataVersion: string;
  status?: 'PENDING_SOURCE';
  note?: string;
  childBenefit: {
    eldestWeeklyPence: number | null;
    additionalChildWeeklyPence: number | null;
    sourceId: string;
  };
  guardiansAllowance?: { weeklyPerChildPence: number | null; [k: string]: unknown };
  universalCredit?: Record<string, unknown>;
  benefitCap?: { annualOutsideLondonPence: number; annualLondonPence: number };
  carersAllowance?: Record<string, unknown>;
  incomeSupportApplicableAmounts: IncomeSupportApplicableAmounts;
  /** DWP capital rules. DEFAULT_CAPITAL must agree with these — a test asserts it. */
  capitalRules?: {
    upperLimitPence: number;
    disregardedPence: number;
    childDisregardPence: number;
    tariffPerBlockPence: number;
    blockSizePence: number;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface LawfulnessFlag {
  code: string;
  summary: string;
  sourceUrl: string;
  decisionDate: string;
  /**
   * A finding about a policy the council has since changed is not a finding
   * about the council today, and saying otherwise is the exact error this
   * site's copy rule exists to prevent. Devon is the live example: found at
   * fault in January 2024, changed the policy from 1 January 2024, and a later
   * complaint about the current practice was not upheld.
   */
  concernsFormerPolicy?: boolean;
  policyChangedOn?: string;
  supersededBy?: {
    summary: string;
    sourceUrl: string;
    decisionDate: string;
  };
}

export interface LaOverride {
  slug: string;
  name: string;
  nation: Nation;
  region: EnglandRegion;
  /** [R9] false → the engine ignores this entry entirely. See spec §8.6. */
  publishable: boolean;
  pendingSourceIssue?: string;
  corePolicy: string;
  flatCoreRateWeeklyPence?: number;
  enhancementWeeklyPence?: number;
  deductsChildBenefit?: boolean;
  deductsChildBenefitFromMeansTestedClaimants?: boolean;
  /**
   * The fraction of the core fostering rate this council pays, where it pays a
   * fixed one: 0.667 for two-thirds, and so on. `null` means "we looked, and it
   * does not", which is a different statement from the field being absent.
   *
   * This exists because the flag used to be raised by pattern-matching the
   * prose in `corePolicy`, which said "Percentage model abolished 2018" for
   * North Tyneside and "100% of core fostering allowance" for Devon. Both
   * tripped it. The site was telling carers that a council which had scrapped
   * the practice in 2018, and one which pays the full rate, were operating the
   * very policy the courts struck down. An accusation like that is never
   * inferred from prose again: it is a recorded fact or it is not made.
   */
  fixedPercentageOfFosteringRate?: number | null;
  taper?: TaperConfig | null;
  capital?: CapitalConfig | null;
  /**
   * What this council allows for basic living costs, as a percentage of the
   * Income Support applicable amount. The DfE model says 125. Devon's published
   * procedures say 100, which is a real, sourced local variation and the reason
   * this is per-council rather than a constant. Absent means "follows the
   * model", never "we did not check".
   */
  livingCostsMultiplierPercent?: number;
  lawfulnessFlag?: LawfulnessFlag | null;
  /** Recorded when a council says its own policy is being rewritten. */
  policyUnderReview?: boolean;
  policyUnderReviewNote?: string;
  policySourceUrl: string;
  /** When the policy we are describing was published, so a claim can be dated. */
  policySourceDate?: string;
  verifiedOn: string;
}

export interface KinshipZones {
  programme: string;
  liveFrom: string;
  runsUntil: string;
  fundingFirstTwoYearsPence?: number;
  approxChildren?: number;
  allowanceBasis: string;
  evaluator?: string;
  localAuthorities: string[];
  eligibility: {
    orderTypes: string[];
    childWouldOtherwiseBeInCare: boolean;
    excludesThoseAlreadyOnReg6Support: boolean;
  };
  lastVerified: string;
  reviewEvery: string;
  warning: string;
}
