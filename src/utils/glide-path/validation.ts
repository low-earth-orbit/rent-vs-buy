import { DEFAULTS } from "./presets";
import type {
  GlidePathErrors,
  GlidePathInput,
  GlidePathInputKey,
} from "./types";

interface Constraint {
  min: number;
  max: number;
  step: number;
  label: string;
}

export const FIELD_CONSTRAINTS: Record<GlidePathInputKey, Constraint> = {
  currentAge: { min: 18, max: 90, step: 1, label: "Current age" },
  retirementAge: { min: 30, max: 90, step: 1, label: "Retirement age" },
  planningAge: { min: 60, max: 110, step: 1, label: "Plan until age" },
  preRetirementIncome: {
    min: 1,
    max: 100_000_000,
    step: 10000,
    label: "Pre-retirement income",
  },
  currentSavings: {
    min: 0,
    max: 100_000_000,
    step: 10000,
    label: "Current savings",
  },
  annualContribution: {
    min: 0,
    max: 100_000_000,
    step: 1000,
    label: "Annual contribution",
  },
  targetIncome: {
    min: 1,
    max: 100_000_000,
    step: 1000,
    label: "Target income",
  },
  pensionPct: { min: 0, max: 150, step: 5, label: "Pension %" },
  pensionStartAge: { min: 50, max: 90, step: 1, label: "Pension start age" },
  flexibility: { min: 0, max: 1, step: 0.05, label: "Spending flexibility" },
  withdrawalRate: { min: 1, max: 10, step: 0.1, label: "Withdrawal rate" },
  gamma: { min: 0.5, max: 15, step: 0.5, label: "Risk aversion γ" },
  beta: { min: 0.9, max: 1, step: 0.005, label: "Time discount β" },
  bequestYears: { min: 0, max: 100, step: 1, label: "Bequest (years)" },
  maxEquityPct: { min: 10, max: 300, step: 5, label: "Max equity %" },
  borrowCost: { min: 0, max: 10, step: 0.25, label: "Borrow cost" },
  interval: { min: 1, max: 10, step: 1, label: "Glide step" },
  numPaths: { min: 500, max: 20000, step: 500, label: "Monte Carlo paths" },
  inflation: { min: 0, max: 5, step: 0.1, label: "Inflation" },
};

const KEYS = Object.keys(DEFAULTS) as GlidePathInputKey[];

export function validateGlidePathInput(input: GlidePathInput): GlidePathErrors {
  const errors: GlidePathErrors = {};

  for (const key of KEYS) {
    const value = input[key];
    const { min, max, label } = FIELD_CONSTRAINTS[key];
    if (typeof value !== "number" || Number.isNaN(value)) {
      errors[key] = `${label} is required.`;
      continue;
    }
    const hasMin = min != null;
    const hasMax = max != null;
    if ((hasMin && value < min) || (hasMax && value > max)) {
      if (hasMin && hasMax) {
        errors[key] = `Must be between ${min} and ${max}`;
      } else if (hasMin) {
        errors[key] = `Must be at least ${min}`;
      } else {
        errors[key] = `Must be at most ${max}`;
      }
    }
  }

  // Cross-field: phases must have positive length.
  if (
    !errors.retirementAge &&
    !errors.currentAge &&
    input.retirementAge <= input.currentAge
  ) {
    errors.retirementAge = "Retirement age must be after your current age.";
  }
  if (
    !errors.planningAge &&
    !errors.retirementAge &&
    input.planningAge <= input.retirementAge
  ) {
    errors.planningAge = "Plan-until age must be after retirement.";
  }

  return errors;
}
