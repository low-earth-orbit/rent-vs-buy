import type {
  IncomeBreakdown,
  ProjectionPoint,
  RetirementInput,
  RetirementResult,
} from "./types";

/**
 * Real (inflation-adjusted) arithmetic mean return for a given nominal return.
 * Working in real dollars lets us keep income and benefits constant over time,
 * which makes the projection easy to verify by hand.
 */
export function realMean(nominalPct: number, inflationPct: number): number {
  return (1 + nominalPct / 100) / (1 + inflationPct / 100) - 1;
}

/** Real expected return for the phase the given age falls in. */
export function phaseRealMean(
  input: RetirementInput,
  retirementAge: number,
  age: number,
): number {
  const nominal = age < retirementAge ? input.accumReturn : input.retireReturn;
  return realMean(nominal, input.inflationRate);
}

/**
 * Target gross income, guaranteed income, and the gap the portfolio must fund.
 * All taxable and in gross terms, so guaranteed income offsets the target
 * dollar-for-dollar and tax is implicit in the gross target.
 */
export function incomeBreakdown(input: RetirementInput): IncomeBreakdown {
  const targetGrossIncome = (input.currentIncome * input.targetIncomePct) / 100;
  const guaranteedIncome =
    (input.currentIncome * input.guaranteedIncomePct) / 100;
  return {
    targetGrossIncome,
    guaranteedIncome,
    portfolioWithdrawal: Math.max(0, targetGrossIncome - guaranteedIncome),
  };
}

/** The annual gross (taxable) amount the portfolio must supply. */
export function grossPortfolioWithdrawal(input: RetirementInput): number {
  return incomeBreakdown(input).portfolioWithdrawal;
}

interface PathResult {
  points: ProjectionPoint[];
  /** Age at which the portfolio first goes negative, or null if it never does. */
  depletionAge: number | null;
}

/**
 * Deterministic year-by-year portfolio path (today's dollars) for a given
 * retirement age, using each phase's mean real return. Contributions and
 * withdrawals happen mid-year, earning a half-year of return — matching the
 * rent-vs-buy convention.
 */
export function projectPath(
  input: RetirementInput,
  retirementAge: number,
): PathResult {
  const contribution = (input.currentIncome * input.contributionPct) / 100;
  const withdrawal = grossPortfolioWithdrawal(input);

  let balance = input.currentSavings;
  const points: ProjectionPoint[] = [{ age: input.currentAge, balance }];
  let depletionAge: number | null = null;

  for (let age = input.currentAge; age < input.planningAge; age++) {
    const r = phaseRealMean(input, retirementAge, age);
    const flow = age < retirementAge ? contribution : -withdrawal;
    balance = balance * (1 + r) + flow * (1 + r / 2);

    const nextAge = age + 1;
    points.push({ age: nextAge, balance });
    if (balance < 0 && depletionAge === null) depletionAge = nextAge;
  }

  return { points, depletionAge };
}

/**
 * Deterministic earliest retirement age whose plan survives to `planningAge`
 * on mean returns and stays within the user's maximum initial withdrawal rate.
 */
export function computeRetirement(input: RetirementInput): RetirementResult {
  const breakdown = incomeBreakdown(input);
  const maxInitialWithdrawalRate = input.swr / 100;

  for (let age = input.currentAge; age < input.planningAge; age++) {
    const { points, depletionAge } = projectPath(input, age);
    if (depletionAge === null) {
      const atRetirement = points.find((p) => p.age === age);
      const portfolioAtRetirement = atRetirement ? atRetirement.balance : null;
      const impliedWithdrawalRate =
        portfolioAtRetirement && portfolioAtRetirement > 0
          ? breakdown.portfolioWithdrawal / portfolioAtRetirement
          : null;
      const withdrawalRateIsFeasible =
        breakdown.portfolioWithdrawal === 0 ||
        (impliedWithdrawalRate != null &&
          impliedWithdrawalRate <= maxInitialWithdrawalRate);

      if (!withdrawalRateIsFeasible) continue;

      return {
        ...breakdown,
        earliestRetirementAge: age,
        yearsUntilRetirement: age - input.currentAge,
        portfolioAtRetirement,
        impliedWithdrawalRate,
        path: points,
      };
    }
  }

  return {
    ...breakdown,
    earliestRetirementAge: null,
    yearsUntilRetirement: null,
    portfolioAtRetirement: null,
    impliedWithdrawalRate: null,
    path: null,
  };
}
