import { describe, expect, it } from "vitest";
import { DEFAULTS, getWithdrawalRatePresetForHorizon } from "./presets";
import {
  computeRetirement,
  incomeBreakdown,
  phaseRealMean,
  projectPath,
  realMean,
  recommendedSwr,
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
    expect(getWithdrawalRatePresetForHorizon(20).rate).toBe(5.2);
    expect(getWithdrawalRatePresetForHorizon(30).rate).toBe(3.8);
    expect(getWithdrawalRatePresetForHorizon(31).rate).toBe(3.4);
    expect(getWithdrawalRatePresetForHorizon(40).rate).toBe(3.2);
    expect(getWithdrawalRatePresetForHorizon(60).rate).toBe(3.2);
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
    expect(
      result.impliedWithdrawalRateFromSavingsAndFuturePensionValue,
    ).toBeNull();
    expect(result.impliedWithdrawalRateFromPortfolio).toBeNull();
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
    expect(
      result.impliedWithdrawalRateFromSavingsAndFuturePensionValue,
    ).not.toBeNull();
    expect(
      result.impliedWithdrawalRateFromSavingsAndFuturePensionValue!,
    ).toBeLessThanOrEqual(input.swr / 100);

    const previousAge = age - 1;
    const previousPath = projectPath(input, previousAge);
    const previousBalance = balanceAt(input, previousAge);
    // Mirror the engine: the first-year draw is the full target before the
    // pension starts, otherwise the income gap.
    const previousFirstYearWithdrawal =
      previousAge >= input.pensionStartAge
        ? result.portfolioWithdrawal
        : result.targetGrossIncome;
    const previousWithdrawalRate =
      previousBalance && previousBalance > 0
        ? previousFirstYearWithdrawal / previousBalance
        : Infinity;

    expect(
      previousPath.depletionAge !== null ||
        previousWithdrawalRate > input.swr / 100,
    ).toBe(true);
  });

  it("uses the full target for the first-year rate when retiring before the pension", () => {
    const input = base({
      currentAge: 50,
      currentSavings: 5_000_000,
      pensionStartAge: 65,
      guaranteedIncomePct: 0,
    });
    const result = computeRetirement(input);

    expect(result.earliestRetirementAge).toBe(50); // retires before the pension
    // First-year draw is the full target (not the income gap) during the bridge.
    expect(
      result.impliedWithdrawalRateFromSavingsAndFuturePensionValue!,
    ).toBeCloseTo(result.targetGrossIncome / 5_000_000, 6);
  });

  it("makes retirement no earlier when the pension starts later (longer bridge)", () => {
    const earlyPension = computeRetirement(base({ pensionStartAge: 60 }));
    const latePension = computeRetirement(base({ pensionStartAge: 72 }));

    expect(earlyPension.earliestRetirementAge).not.toBeNull();
    expect(latePension.earliestRetirementAge).not.toBeNull();
    expect(latePension.earliestRetirementAge!).toBeGreaterThanOrEqual(
      earlyPension.earliestRetirementAge!,
    );
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

describe("recommendedSwr", () => {
  it("does not depend on the current swr (no feedback loop)", () => {
    const aggressive = recommendedSwr(base({ swr: 5.2 }));
    const cautious = recommendedSwr(base({ swr: 3.2 }));
    expect(aggressive).not.toBeNull();
    expect(aggressive!.rate).toBe(cautious!.rate);
  });

  it("recommends a rate that is safe for the horizon it produces", () => {
    const rec = recommendedSwr(base())!;
    expect(rec.rate).toBeLessThanOrEqual(
      getWithdrawalRatePresetForHorizon(rec.horizonYears).rate + 1e-9,
    );
  });

  it("keeps the default swr consistent with its own recommendation", () => {
    // Guards against DEFAULTS.swr drifting away from what the engine recommends.
    expect(recommendedSwr(DEFAULTS)!.rate).toBe(DEFAULTS.swr);
  });
});
