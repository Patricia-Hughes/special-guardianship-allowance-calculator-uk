/**
 * Zod schemas — spec §6 ("Zod schemas double as engine input validation") and
 * the validation table at §20.1. The web form and the engine share these, so a
 * value that passes the form cannot fail the engine and vice versa.
 */

import { z } from 'zod';
import { ValidationError } from './errors.js';
import type { CalculatorInput } from './types.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** £100,000/month ceiling on any money field (spec §20.1). */
export const MAX_MONEY_PENCE = 10_000_000;

const isoDateSchema = z
  .string()
  .regex(ISO_DATE_RE, 'Enter a date as YYYY-MM-DD.')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Enter a real date.');

const penceSchema = z
  .number()
  .int('Enter an amount like 1250 or 1250.50.')
  .min(0, 'Enter an amount of £0 or more.');

const moneyFieldSchema = penceSchema.max(
  MAX_MONEY_PENCE,
  'Enter an amount like 1250 or 1250.50.',
);

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

export const childInputSchema = z.object({
  id: z.string().min(1),
  // invalid_type_error matters as much as the range messages. Without it, an
  // empty box or a typed word falls through to Zod's own wording, and the carer
  // is told "Expected number, received nan", which tells them nothing about
  // what to do. Every message here has to make sense to someone who has never
  // seen a form error before.
  ageYears: z
    .number({
      required_error: 'Enter the child’s age, in years.',
      invalid_type_error: 'Enter the child’s age as a number, in years. For a baby under one, enter 0.',
    })
    .int('Enter the age in whole years. For a child of two and a half, enter 2.')
    .min(0, 'An age cannot be less than 0. For a baby under one, enter 0.')
    .max(
      17,
      'This calculator is for children under 18. If they have turned 18, support works differently, and our guide on turning 18 explains what happens next.',
    ),
  dateOfBirth: isoDateSchema.optional(),
  hasDisabilityOrAdditionalNeeds: z.boolean(),
  wasLookedAfterImmediatelyBeforeOrder: z.union([z.boolean(), z.literal('unknown')]),
  isEldestInHousehold: z.boolean(),
});

export const carerInputSchema = z
  .object({
    nation: nationSchema,
    englandRegion: englandRegionSchema.optional(),
    localAuthoritySlug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    wasFosterCarerForThisChild: z.boolean(),
    orderDate: isoDateSchema.optional(),
    monthsSinceOrderMade: z.number().int().min(0).max(1200),
    previousWeeklyFosteringAllowance: penceSchema
      .max(100_000, 'Enter the weekly amount you received as a foster carer.')
      .optional(),
    onMeansTestedBenefits: z.boolean(),
    meansTestedBenefitsHeld: z.array(meansTestedBenefitSchema).optional(),
    childWouldOtherwiseBeInCare: z.boolean().optional(),
    alreadyReceivingReg6Support: z.boolean().optional(),
  })
  .superRefine((c, ctx) => {
    if (c.nation === 'england' && !c.englandRegion && !c.localAuthoritySlug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['englandRegion'],
        message: 'Choose a region so we can use the right rates.',
      });
    }
    if (c.wasFosterCarerForThisChild && c.previousWeeklyFosteringAllowance === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['previousWeeklyFosteringAllowance'],
        message: 'Enter the weekly amount you received as a foster carer.',
      });
    }
  });

export const financesInputSchema = z.object({
  netEarnings: moneyFieldSchema,
  otherIncome: moneyFieldSchema,
  countableBenefits: moneyFieldSchema,
  childBenefitOtherChildren: moneyFieldSchema,
  savingsCapital: penceSchema.max(1_000_000_000),
  housingCosts: moneyFieldSchema,
  councilTax: moneyFieldSchema,
  childcareCosts: moneyFieldSchema,
  essentialLoanRepayments: moneyFieldSchema,
  maintenancePaid: moneyFieldSchema,
  pensionContributions: moneyFieldSchema,
  // Every message here is read by a carer, so every one needs wording, including
  // the type errors. A bare .min(0) leaves Zod to say "Expected number, received
  // nan" when the box is empty, which is the failure this whole file exists to
  // avoid.
  adultsInHousehold: z
    .number({
      required_error: 'Enter how many adults live in your household.',
      invalid_type_error: 'Enter how many adults live in your household, as a number from 1 to 6.',
    })
    .int('Enter a whole number of adults, from 1 to 6.')
    .min(1, 'There is at least one adult in the household: you. Enter 1 or more.')
    .max(6, 'Enter a number from 1 to 6. If your household is larger, enter 6.'),
  dependentChildrenInHousehold: z
    .number({
      required_error: 'Enter how many dependent children live in your household.',
      invalid_type_error:
        'Enter how many dependent children live in your household, as a number.',
    })
    .int('Enter a whole number of children.')
    .min(0, 'Enter 0 or more.')
    .max(20, 'Enter a number up to 20. If your household is larger, enter 20.'),
  householdHasDisabilityPremium: z.boolean().optional(),
  householdHasCarerPremium: z.boolean().optional(),
  claimantUnder25: z.boolean().optional(),
});

export const taperConfigSchema = z.object({
  method: z.enum(['pound-for-pound', 'percentage', 'threshold']),
  percentage: z.number().min(0).max(1).optional(),
  thresholdMonthly: penceSchema.optional(),
});

export const calculatorInputSchema = z
  .object({
    carer: carerInputSchema,
    children: z
      .array(childInputSchema)
      .min(1, 'Add at least one child.')
      .max(10, 'This calculator handles up to 10 children.'),
    finances: financesInputSchema.optional(),
    applyChildBenefitDeduction: z.boolean().default(false),
    taperOverride: taperConfigSchema.optional(),
    asAtDate: isoDateSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if (
      input.finances &&
      input.finances.dependentChildrenInHousehold < input.children.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['finances', 'dependentChildrenInHousehold'],
        message: "This should include the children you've already entered.",
      });
    }
    if (input.children.filter((c) => c.isEldestInHousehold).length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['children'],
        message: 'Only one child can be the eldest in the household.',
      });
    }
  });

/** Parse, converting Zod's error into the engine's own ValidationError. */
export function parseCalculatorInput(input: unknown): CalculatorInput {
  const result = calculatorInputSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    throw new ValidationError(
      issues[0]?.message ?? 'That input is not valid.',
      issues,
    );
  }
  return result.data as CalculatorInput;
}
