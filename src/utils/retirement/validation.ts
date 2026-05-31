import { DEFAULTS } from "./presets";
import type {
  RetirementErrors,
  RetirementInput,
  RetirementInputKey,
} from "./types";

interface Constraint {
  min: number;
  max: number;
  step: number;
  label: string;
}

// Labels match the on-screen field labels so validation errors name the field
// the user is looking at.
export const FIELD_CONSTRAINTS: Record<RetirementInputKey, Constraint> = {
  currentAge: { min: 18, max: 90, step: 1, label: "Current age" },
  planningAge: { min: 60, max: 110, step: 1, label: "Planning age" },
  currentSavings: {
    min: 0,
    max: 100_000_000,
    step: 1000,
    label: "Current savings",
  },
  currentIncome: {
    min: 1,
    max: 100_000_000,
    step: 1000,
    label: "Current annual income",
  },
  contributionPct: { min: 0, max: 100, step: 1, label: "Annual savings" },
  targetIncomePct: { min: 0, max: 150, step: 1, label: "Target income" },
  guaranteedIncomePct: { min: 0, max: 100, step: 1, label: "Pension amount" },
  pensionStartAge: { min: 50, max: 75, step: 1, label: "Pension start age" },
  accumReturn: { min: 0, max: 15, step: 0.1, label: "Return while working" },
  retireReturn: { min: 0, max: 15, step: 0.1, label: "Return in retirement" },
  inflationRate: { min: 0, max: 5, step: 0.1, label: "Inflation" },
  swr: {
    min: 0.1,
    max: 10,
    step: 0.1,
    label: "Safe initial withdrawal rate",
  },
};

const KEYS = Object.keys(DEFAULTS) as RetirementInputKey[];

export function validateRetirementInput(
  input: RetirementInput,
): RetirementErrors {
  const errors: RetirementErrors = {};

  for (const key of KEYS) {
    const value = input[key];
    const { min, max, label } = FIELD_CONSTRAINTS[key];

    if (typeof value !== "number" || Number.isNaN(value)) {
      errors[key] = `${label} is required.`;
      continue;
    }
    if (value < min || value > max) {
      errors[key] = `${label} must be between ${min} and ${max}.`;
    }
  }

  // Cross-field: you must plan to an age beyond today.
  if (
    !errors.planningAge &&
    !errors.currentAge &&
    input.planningAge <= input.currentAge
  ) {
    errors.planningAge = "Plan-to age must be greater than your current age.";
  }

  return errors;
}
