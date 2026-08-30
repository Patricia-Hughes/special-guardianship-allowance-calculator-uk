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
  ageYears: z
    .number()
    .int('Enter an age between 0 and 17.')
    .min(0, 'Enter an age between 0 and 17.')
    .max(17, 'This calculator covers children under 18. Support after 18 works differently — read our guide.'),
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
  adultsInHousehold: z.number().int().min(1, 'Enter 1 to 6.').max(6, 'Enter 1 to 6.'),
  dependentChildrenInHousehold: z.number().int().min(0).max(20),
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
