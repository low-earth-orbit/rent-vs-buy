import type { DEFAULTS } from "./presets";

export type RetirementInputKey = keyof typeof DEFAULTS;

/**
 * Retirement planner inputs. Typed as numbers, but form fields may transiently
 * hold "" while editing (mirrors the rent-vs-buy convention); validation
 * flags those before the engine runs.
 */
export type RetirementInput = Record<RetirementInputKey, number>;

export type RetirementErrors = Partial<Record<RetirementInputKey, string>>;

export interface ProjectionPoint {
  age: number;
  /** Portfolio balance in today's (real) dollars at the start of this age. */
  balance: number;
}

/** Annual income breakdown (real $/yr) - independent of retirement age. */
export interface IncomeBreakdown {
  /** Target gross retirement income. */
  targetGrossIncome: number;
  /** Guaranteed gross income from CPP/OAS/DB pensions. */
  guaranteedIncome: number;
  /** Gross (taxable) amount the portfolio must withdraw each year. */
  portfolioWithdrawal: number;
}

export interface RetirementResult {
  /** Earliest age the user can retire and not run out before `planningAge`. */
  earliestRetirementAge: number | null;
  yearsUntilRetirement: number | null;
  /** Portfolio balance (real $) at the recommended retirement age. */
  portfolioAtRetirement: number | null;
  pensionValue: number | null;
  /** Year-by-year balance path for the recommended retirement age. */
  path: ProjectionPoint[] | null;

  // Income breakdown (real $/yr), always populated — even for an infeasible plan.
  /** Target gross retirement income. */
  targetGrossIncome: number;
  /** Guaranteed gross income from CPP/OAS/DB pensions. */
  guaranteedIncome: number;
  /** Gross (taxable) amount the portfolio must withdraw each year. */
  portfolioWithdrawal: number;
  /** First-year withdrawal ÷ portfolio at retirement + future pension value.*/
  impliedWithdrawalRateFromNetWorth: number | null;
  /** First-year withdrawal ÷ portfolio at retirement. */
  impliedWithdrawalRateFromPortfolio: number | null;
}
