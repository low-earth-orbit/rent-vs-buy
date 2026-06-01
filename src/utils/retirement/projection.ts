import {
  WITHDRAWAL_RATE_PRESETS,
  getWithdrawalRatePresetForHorizon,
} from "./presets";
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

/**
 * The portfolio's required gross withdrawal at a given age. Before the pension
 * starts the portfolio funds the full target (the "bridge"); once guaranteed
 * income kicks in, only the remaining gap.
 */
function withdrawalAtAge(
  input: RetirementInput,
  breakdown: IncomeBreakdown,
  age: number,
): number {
  return age >= input.pensionStartAge
    ? breakdown.portfolioWithdrawal
    : breakdown.targetGrossIncome;
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
  const breakdown = incomeBreakdown(input);

  let balance = input.currentSavings;
  const points: ProjectionPoint[] = [{ age: input.currentAge, balance }];
  let depletionAge: number | null = null;

  for (let age = input.currentAge; age < input.planningAge; age++) {
    const r = phaseRealMean(input, retirementAge, age);
    const flow =
      age < retirementAge
        ? contribution
        : -withdrawalAtAge(input, breakdown, age);
    balance = balance * (1 + r) + flow * (1 + r / 2);

    const nextAge = age + 1;
    points.push({ age: nextAge, balance });
    if (balance < 0 && depletionAge === null) depletionAge = nextAge;
  }

  return { points, depletionAge };
}

/**
 * Deterministic earliest retirement age whose plan survives to `planningAge`
 * on mean returns and whose first-year withdrawal stays within the user's
 * safe withdrawal rate. The first-year draw is the full target when
 * retiring before the pension starts (the bridge), otherwise the income gap.
 */
export function computeRetirement(input: RetirementInput): RetirementResult {
  const breakdown = incomeBreakdown(input);
  const maxInitialWithdrawalRate = input.swr / 100;

  const pensionValue =
    breakdown.guaranteedIncome > 0
      ? breakdown.guaranteedIncome * (input.planningAge - input.pensionStartAge)
      : null;

  for (let age = input.currentAge; age < input.planningAge; age++) {
    const { points, depletionAge } = projectPath(input, age);
    if (depletionAge !== null) continue;

    const atRetirement = points.find((p) => p.age === age);

    const portfolioAtRetirement = atRetirement ? atRetirement.balance : null;

    const netWorthAtRetirement = portfolioAtRetirement
      ? portfolioAtRetirement + (pensionValue || 0)
      : null;

    const firstYearWithdrawal = withdrawalAtAge(input, breakdown, age);
    const impliedWithdrawalRateFromNetWorth =
      netWorthAtRetirement && netWorthAtRetirement > 0
        ? firstYearWithdrawal / netWorthAtRetirement
        : null;
    const impliedWithdrawalRateFromPortfolio =
      portfolioAtRetirement && portfolioAtRetirement > 0
        ? firstYearWithdrawal / portfolioAtRetirement
        : null;
    const withdrawalRateIsFeasible =
      firstYearWithdrawal === 0 ||
      (impliedWithdrawalRateFromNetWorth != null &&
        impliedWithdrawalRateFromNetWorth <= maxInitialWithdrawalRate);

    if (!withdrawalRateIsFeasible) continue;

    return {
      ...breakdown,
      earliestRetirementAge: age,
      yearsUntilRetirement: age - input.currentAge,
      portfolioAtRetirement,
      pensionValue,
      impliedWithdrawalRateFromNetWorth,
      impliedWithdrawalRateFromPortfolio,
      path: points,
    };
  }

  return {
    ...breakdown,
    earliestRetirementAge: null,
    yearsUntilRetirement: null,
    portfolioAtRetirement: null,
    pensionValue: null,
    impliedWithdrawalRateFromNetWorth: null,
    impliedWithdrawalRateFromPortfolio: null,
    path: null,
  };
}

export interface SwrRecommendation {
  rate: number;
  horizonYears: number;
}

/**
 * A self-consistent safe withdrawal rate. A higher rate lets you retire
 * earlier, which makes retirement *longer*, which needs a *lower* safe rate — so
 * a naive "rate for planningAge − retirementAge" recommendation ping-pongs
 * between two presets (the rate that selects the age also depends on the age).
 *
 * Instead we pick the highest preset rate that is still safe for the horizon it
 * produces. This doesn't depend on the user's current `swr`, so it's stable.
 */
export function recommendedSwr(
  input: RetirementInput,
): SwrRecommendation | null {
  for (const preset of WITHDRAWAL_RATE_PRESETS) {
    const age = computeRetirement({
      ...input,
      swr: preset.rate,
    }).earliestRetirementAge;
    if (age == null) continue;

    const horizonYears = Math.max(0, input.planningAge - age);
    const safeRate = getWithdrawalRatePresetForHorizon(horizonYears).rate;
    if (preset.rate <= safeRate + 1e-9) {
      return { rate: preset.rate, horizonYears };
    }
  }
  return null;
}
