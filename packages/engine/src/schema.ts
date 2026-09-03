/**
 * Zod schemas, spec §6 and the validation table at §20.1.
 *
 * The web form and the engine share these, so a value that passes the form
 * cannot fail the engine and vice versa.
 *
 * Every message here is read by a carer, so every one needs wording, including
 * the type errors. A bare `.min(0)` leaves Zod to say "Expected number,
 * received nan" when a box is empty, which tells someone who has never seen a
 * form error before precisely nothing about what to do. That failure is what
 * this file exists to prevent.
 */

import { z } from 'zod';
import { ValidationError } from './errors.js';
import type { CalculatorInput } from './types.js';

// ─── Limits ────────────────────────────────────────────────────────────────

/** £100,000 a month ceiling on any money field (spec §20.1). */
export const MAX_MONEY_PENCE = 10_000_000;
/** £1,000 a week is far above any real fostering allowance. */
const MAX_FOSTERING_ALLOWANCE_PENCE = 100_000;
/** £10m of savings. Past this the means test is not the carer's problem. */
const MAX_SAVINGS_PENCE = 1_000_000_000;
const MAX_CHILDREN = 10;
const MAX_CHILD_AGE = 17;
const MAX_ADULTS = 6;
const MAX_HOUSEHOLD_CHILDREN = 20;
/** 100 years, so a mistyped date cannot pass as a very old order. */
const MAX_MONTHS_SINCE_ORDER = 1200;

// ─── Primitives ────────────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isoDateSchema = z
  .string()
  .regex(ISO_DATE_RE, 'Enter a date as YYYY-MM-DD.')
  // Round-tripping catches 2026-02-30, which Date happily rolls into March.
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Enter a real date.');

const penceSchema = z
  .number()
  .int('Enter an amount like 1250 or 1250.50.')
  .min(0, 'Enter an amount of £0 or more.');

const moneyFieldSchema = penceSchema.max(MAX_MONEY_PENCE, 'Enter an amount like 1250 or 1250.50.');

export const nationSchema = z.enum(['england', 'wales', 'scotland', 'northern-ireland']);
export const englandRegionSchema = z.enum(['london', 'south-east', 'rest-of-england']);

export const meansTestedBenefitSchema = z.enum([
  'universal-credit',
  'income-support',
  'jsa-income-based',
  'esa-income-related',
  'pension-credit',
  'housing-benefit',
  'council-tax-support',
]);

/** Add a cross-field problem at the path of the box the carer should look at. */
const problem = (ctx: z.RefinementCtx, path: (string | number)[], message: string): void => {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
};

// ─── One child ─────────────────────────────────────────────────────────────

export const childInputSchema = z.object({
  id: z.string().min(1),
  ageYears: z
    .number({
      required_error: 'Enter the child’s age, in years.',
      invalid_type_error: 'Enter the child’s age as a number, in years. For a baby under one, enter 0.',
    })
    .int('Enter the age in whole years. For a child of two and a half, enter 2.')
    .min(0, 'An age cannot be less than 0. For a baby under one, enter 0.')
    .max(
      MAX_CHILD_AGE,
      'This calculator is for children under 18. If they have turned 18, support works differently, and our guide on turning 18 explains what happens next.',
    ),
  dateOfBirth: isoDateSchema.optional(),
  hasDisabilityOrAdditionalNeeds: z.boolean(),
  wasLookedAfterImmediatelyBeforeOrder: z.union([z.boolean(), z.literal('unknown')]),
  isEldestInHousehold: z.boolean(),
});

// ─── The carer ─────────────────────────────────────────────────────────────

export const carerInputSchema = z
  .object({
    nation: nationSchema,
    englandRegion: englandRegionSchema.optional(),
    localAuthoritySlug: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    wasFosterCarerForThisChild: z.boolean(),
    orderDate: isoDateSchema.optional(),
    monthsSinceOrderMade: z.number().int().min(0).max(MAX_MONTHS_SINCE_ORDER).optional(),
    previousWeeklyFosteringAllowance: penceSchema
      .max(
        MAX_FOSTERING_ALLOWANCE_PENCE,
        'Enter the weekly amount you received as a foster carer.',
      )
      .optional(),
    onMeansTestedBenefits: z.boolean(),
    meansTestedBenefitsHeld: z.array(meansTestedBenefitSchema).optional(),
    childWouldOtherwiseBeInCare: z.boolean().optional(),
    alreadyReceivingReg6Support: z.boolean().optional(),
  })
  .superRefine((carer, ctx) => {
    // England rates vary by region, so one of the two routes to a region has to
    // be taken. Everywhere else has a single national table.
    if (carer.nation === 'england' && !carer.englandRegion && !carer.localAuthoritySlug) {
      problem(ctx, ['englandRegion'], 'Choose a region so we can use the right rates.');
    }
    // Without the previous allowance the reg 7 floor cannot be applied, and a
    // former foster carer would silently be shown a figure below it.
    if (carer.wasFosterCarerForThisChild && carer.previousWeeklyFosteringAllowance === undefined) {
      problem(
        ctx,
        ['previousWeeklyFosteringAllowance'],
        'Enter the weekly amount you received as a foster carer.',
      );
    }
    // And without the timing it cannot be applied either, for the same reason.
    // The reg 7 window is the 24 months after the order, so an amount with no
    // date attached is an amount the engine has to ignore. It used to ignore it
    // in silence: a carer who gave a 500 pound allowance and left both date
    // boxes empty was shown the standard rate instead, with no error and
    // nothing to say a figure they had entered had been discarded.
    if (
      carer.wasFosterCarerForThisChild &&
      carer.orderDate === undefined &&
      carer.monthsSinceOrderMade === undefined
    ) {
      problem(
        ctx,
        ['monthsSinceOrderMade'],
        'Tell us when the order was made, either the date or roughly how many months ago. ' +
          'Your old fostering rate only counts for the first two years.',
      );
    }
  });

// ─── Finances ──────────────────────────────────────────────────────────────

export const financesInputSchema = z.object({
  netEarnings: moneyFieldSchema,
  otherIncome: moneyFieldSchema,
  countableBenefits: moneyFieldSchema,
  childBenefitOtherChildren: moneyFieldSchema,
  savingsCapital: penceSchema.max(MAX_SAVINGS_PENCE),
  housingCosts: moneyFieldSchema,
  councilTax: moneyFieldSchema,
  childcareCosts: moneyFieldSchema,
  essentialLoanRepayments: moneyFieldSchema,
  maintenancePaid: moneyFieldSchema,
  pensionContributions: moneyFieldSchema,
  adultsInHousehold: z
    .number({
      required_error: 'Enter how many adults live in your household.',
      invalid_type_error: 'Enter how many adults live in your household, as a number from 1 to 6.',
    })
    .int('Enter a whole number of adults, from 1 to 6.')
    .min(1, 'There is at least one adult in the household: you. Enter 1 or more.')
    .max(MAX_ADULTS, 'Enter a number from 1 to 6. If your household is larger, enter 6.'),
  dependentChildrenInHousehold: z
    .number({
      required_error: 'Enter how many dependent children live in your household.',
      invalid_type_error: 'Enter how many dependent children live in your household, as a number.',
    })
    .int('Enter a whole number of children.')
    .min(0, 'Enter 0 or more.')
    .max(
      MAX_HOUSEHOLD_CHILDREN,
      'Enter a number up to 20. If your household is larger, enter 20.',
    ),
  householdHasDisabilityPremium: z.boolean().optional(),
  householdHasCarerPremium: z.boolean().optional(),
  claimantUnder25: z.boolean().optional(),
});

export const taperConfigSchema = z
  .object({
    method: z.enum(['pound-for-pound', 'percentage', 'threshold']),
    percentage: z.number().min(0).max(1).optional(),
    thresholdMonthly: penceSchema.optional(),
  })
  // A method with no figure behind it used to fall back to pound-for-pound,
  // the harshest option, in silence. applyTaper now refuses it, so the
  // configuration has to be caught here rather than blowing up mid-calculation
  // and showing a carer "we cannot estimate this".
  .superRefine((taper, ctx) => {
    if (taper.method === 'percentage' && taper.percentage === undefined) {
      problem(ctx, ['percentage'], 'A percentage taper needs a percentage.');
    }
    if (taper.method === 'threshold' && taper.thresholdMonthly === undefined) {
      problem(ctx, ['thresholdMonthly'], 'A threshold taper needs a threshold.');
    }
  });

// ─── The whole input ───────────────────────────────────────────────────────

export const calculatorInputSchema = z
  .object({
    carer: carerInputSchema,
    children: z
      .array(childInputSchema)
      .min(1, 'Add at least one child.')
      .max(MAX_CHILDREN, 'This calculator handles up to 10 children.'),
    finances: financesInputSchema.optional(),
    applyChildBenefitDeduction: z.boolean().default(false),
    taperOverride: taperConfigSchema.optional(),
    asAtDate: isoDateSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if (input.finances && input.finances.dependentChildrenInHousehold < input.children.length) {
      problem(
        ctx,
        ['finances', 'dependentChildrenInHousehold'],
        "This should include the children you've already entered.",
      );
    }
    if (input.children.filter((c) => c.isEldestInHousehold).length > 1) {
      problem(ctx, ['children'], 'Only one child can be the eldest in the household.');
    }
    checkTheEldestIsTheOldest(input.children, ctx);
  });

/**
 * Marking a younger child as the eldest contradicts the ages just given, and it
 * is not harmless: only the eldest attracts the higher rate of Child Benefit,
 * so the mistake moves money. Easy to make, too, since the choice sits below
 * the ages and the form pre-selects one.
 */
function checkTheEldestIsTheOldest(
  children: Array<{ ageYears: number; isEldestInHousehold: boolean }>,
  ctx: z.RefinementCtx,
): void {
  if (children.length <= 1) return;
  const marked = children.findIndex((c) => c.isEldestInHousehold);
  if (marked < 0) return;

  const markedAge = children[marked]!.ageYears;
  const oldest = Math.max(...children.map((c) => c.ageYears));
  if (markedAge >= oldest) return;

  problem(
    ctx,
    ['children', marked, 'isEldestInHousehold'],
    `You have marked the child aged ${markedAge} as the eldest, but you have also ` +
      `entered a child aged ${oldest}. Only the eldest child attracts the higher rate of ` +
      'Child Benefit, so this changes the figures. Mark the oldest child instead.',
  );
}

/** Parse, converting Zod's error into the engine's own ValidationError. */
export function parseCalculatorInput(input: unknown): CalculatorInput {
  const result = calculatorInputSchema.safeParse(input);
  if (result.success) return result.data as CalculatorInput;

  const issues = result.error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }));
  throw new ValidationError(issues[0]?.message ?? 'That input is not valid.', issues);
}
