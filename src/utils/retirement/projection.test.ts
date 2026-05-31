import { describe, expect, it } from "vitest";
import { DEFAULTS, getWithdrawalRatePresetForHorizon } from "./presets";
import {
  computeRetirement,
  incomeBreakdown,
  phaseRealMean,
  projectPath,
  realMean,
} from "./projection";
import type { RetirementInput } from "./types";

const base = (overrides: Partial<RetirementInput> = {}): RetirementInput => ({
  ...DEFAULTS,
  ...overrides,
});

function balanceAt(
  input: RetirementInput,
  retirementAge: number,
): number | null {
  return (
    projectPath(input, retirementAge).points.find(
      (point) => point.age === retirementAge,
    )?.balance ?? null
  );
}

describe("realMean", () => {
  it("deflates nominal return by inflation", () => {
    expect(realMean(6, 2.5)).toBeCloseTo(1.06 / 1.025 - 1, 6);
  });
});

describe("phaseRealMean", () => {
  it("uses accumulation returns before retirement and retirement returns after", () => {
    const input = base({
      accumReturn: 7,
      retireReturn: 4,
      inflationRate: 2,
    });

    expect(phaseRealMean(input, 65, 64)).toBeCloseTo(1.07 / 1.02 - 1, 6);
    expect(phaseRealMean(input, 65, 65)).toBeCloseTo(1.04 / 1.02 - 1, 6);
  });
});

describe("incomeBreakdown", () => {
  it("calculates the gross income gap the portfolio must fund", () => {
    const result = incomeBreakdown(
      base({
        currentIncome: 100_000,
        targetIncomePct: 60,
        guaranteedIncomePct: 10,
      }),
    );

    expect(result.targetGrossIncome).toBe(60_000);
    expect(result.guaranteedIncome).toBe(10_000);
    expect(result.portfolioWithdrawal).toBe(50_000);
  });
});

describe("withdrawal rate recommendations", () => {
  it("selects a conservative preset that covers the estimated horizon", () => {
    expect(getWithdrawalRatePresetForHorizon(30).rate).toBe(3.75);
    expect(getWithdrawalRatePresetForHorizon(31).rate).toBe(3.5);
    expect(getWithdrawalRatePresetForHorizon(40).rate).toBe(3.5);
    expect(getWithdrawalRatePresetForHorizon(51).rate).toBe(3);
  });
});

describe("computeRetirement", () => {
  it("lets a heavily funded saver retire immediately", () => {
    const result = computeRetirement(
      base({ currentAge: 50, currentSavings: 10_000_000 }),
    );

    expect(result.earliestRetirementAge).toBe(50);
    expect(result.yearsUntilRetirement).toBe(0);
  });

  it("retires immediately when guaranteed income meets the target", () => {
    const result = computeRetirement(
      base({
        currentAge: 65,
        targetIncomePct: 40,
        guaranteedIncomePct: 40,
        currentSavings: 0,
        contributionPct: 0,
      }),
    );

    expect(result.earliestRetirementAge).toBe(65);
    expect(result.portfolioWithdrawal).toBe(0);
    expect(result.impliedWithdrawalRate).toBeNull();
  });

  it("returns null when the plan can never be funded", () => {
    const result = computeRetirement(
      base({
        currentAge: 60,
        currentSavings: 0,
        contributionPct: 0,
        guaranteedIncomePct: 0,
        targetIncomePct: 60,
      }),
    );

    expect(result.earliestRetirementAge).toBeNull();
    expect(result.path).toBeNull();
    expect(result.portfolioWithdrawal).toBeGreaterThan(0);
  });

  it("recommends the first age that survives and meets the withdrawal guardrail", () => {
    const input = base();
    const result = computeRetirement(input);

    expect(result.earliestRetirementAge).not.toBeNull();
    const age = result.earliestRetirementAge!;
    expect(age).toBeGreaterThan(input.currentAge);
    expect(age).toBeLessThan(input.planningAge);
    expect(projectPath(input, age).depletionAge).toBeNull();
    expect(result.impliedWithdrawalRate).not.toBeNull();
    expect(result.impliedWithdrawalRate!).toBeLessThanOrEqual(input.swr / 100);

    const previousAge = age - 1;
    const previousPath = projectPath(input, previousAge);
    const previousBalance = balanceAt(input, previousAge);
    const previousWithdrawalRate =
      previousBalance && previousBalance > 0
        ? result.portfolioWithdrawal / previousBalance
        : Infinity;

    expect(
      previousPath.depletionAge !== null ||
        previousWithdrawalRate > input.swr / 100,
    ).toBe(true);
  });

  it("does not make retirement later when the withdrawal guardrail is relaxed", () => {
    const cautious = computeRetirement(base({ swr: 3 }));
    const flexible = computeRetirement(base({ swr: 5 }));

    expect(cautious.earliestRetirementAge).not.toBeNull();
    expect(flexible.earliestRetirementAge).not.toBeNull();
    expect(flexible.earliestRetirementAge!).toBeLessThanOrEqual(
      cautious.earliestRetirementAge!,
    );
  });
});
