/**
 * @sgo/engine — the Special Guardianship allowance calculation engine.
 *
 * Pure TypeScript: no DOM, no network, integer pence arithmetic. Shippable so
 * advice charities can embed it.
 *
 * Nothing in here gives legal advice. Every numeric output is an estimate and
 * carries the citation it derives from [R3].
 */

export {
  calculate,
  isKinshipZoneEligible,
  regimeFor,
  resolveEnglandRegion,
  ageOf,
  monthsSinceOrder,
  resolveAgeBand,
  lookupRate,
  defaultDeps,
} from './engine.js';
export { withinReg7Window, REG7_WINDOW_MONTHS } from './resolve.js';
export type { EngineDeps } from './engine.js';
export { calculateBackdating, segmentBoundaries, BACKDATING_CAVEATS } from './backdating.js';
export type { BackdatingInput, BackdatingResult, BackdatingSegment, SegmentReason } from './backdating.js';

export {
  runMeansTest,
  applyTaper,
  tariffIncome,
  incomeSupportApplicableAmountWeekly,
  meansTestAvailable,
  COUNTABLE_INCOME,
  DISREGARDED_INCOME,
  DISREGARD_RATE,
  CORE_LIVING_COSTS_MULTIPLIER,
  DEFAULT_TAPER,
  DEFAULT_CAPITAL,
} from './meansTest.js';

export { assertGuardrails, GuardrailViolation } from './guardrails.js';
export { FLAG_CATALOGUE, makeFlag, sortFlags, dedupeFlags } from './flags.js';
export type { FlagContext } from './flags.js';

export {
  pence,
  parseMoney,
  formatMoney,
  add,
  sub,
  mul,
  min,
  max,
  clampMin0,
  apportion,
  weeklyToMonthly,
  monthlyToWeekly,
  weeklyToAnnual,
  ZERO,
} from './money.js';

export {
  isoDate,
  todayUtc,
  ageAt,
  addDays,
  addMonths,
  monthsBetween,
  daysBetween,
  financialYearOf,
  financialYearBoundaries,
  ageBandChangeDates,
  nthBirthday,
  selectRateTable,
  selectBenefitTable,
} from './dates.js';

export {
  RATE_TABLES,
  BENEFIT_TABLES,
  KINSHIP_ZONES,
  LA_OVERRIDES_ALL,
  LA_REGION_MAP,
  LA_NAMES,
  LA_REGION_MAP_META,
  ENGINE_VERSION,
  cite,
  allCitationIds,
  isPublishable,
  publishableLaOverride,
  publishableLaOverrideIn,
  hasUnpublishableLaOverride,
  hasUnpublishableLaOverrideIn,
} from './referenceData.js';

export {
  calculatorInputSchema,
  childInputSchema,
  carerInputSchema,
  financesInputSchema,
  taperConfigSchema,
  parseCalculatorInput,
  MAX_MONEY_PENCE,
} from './schema.js';

export { EngineError, DataError, MoneyError, ValidationError } from './errors.js';
export { FLAGS } from './featureFlags.js';
export type { FeatureFlags } from './featureFlags.js';

export type * from './types.js';
