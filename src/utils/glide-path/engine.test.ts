import { describe, expect, it } from "vitest";
import { DEFAULTS } from "./presets";
import { recommendGlidePath } from "./engine";
import type { GlidePathInput } from "./types";

// Fast settings for tests: few paths, coarse interval.
const base = (overrides: Partial<GlidePathInput> = {}): GlidePathInput => ({
  ...DEFAULTS,
  numPaths: 600,
  interval: 10,
  ...overrides,
});

describe("recommendGlidePath", () => {
  it("returns a coherent schedule covering the full horizon", () => {
    const input = base();
    const r = recommendGlidePath(input);
    const nYears = input.planningAge - input.startAge;

    expect(r.equityByYear).toHaveLength(nYears);
    expect(r.schedule[0].ageStart).toBe(input.startAge);
    expect(r.schedule.at(-1)!.yearEnd).toBe(nYears - 1);
    // Phases labelled by the block's first year.
    expect(r.schedule[0].phase).toBe("accum");
    expect(r.schedule.at(-1)!.phase).toBe("retire");
    // Every weight is on the grid and within [0, maxLeverage].
    for (const w of r.equityByYear) {
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(r.params.maxLeverage + 1e-9);
    }
  });

  it("reports sane outcome stats", () => {
    const r = recommendGlidePath(base());
    expect(r.ceIncome).toBeGreaterThan(0);
    expect(r.depletion).toBeGreaterThanOrEqual(0);
    expect(r.depletion).toBeLessThanOrEqual(1);
    expect(r.drawdownDepletion).toBeGreaterThanOrEqual(0);
    expect(r.drawdownDepletion).toBeLessThanOrEqual(1);
    expect(r.expectedRetirementBalance).toBeGreaterThan(0);
    expect(r.flatDepletion).toBeGreaterThanOrEqual(0);
    expect(r.flatDepletion).toBeLessThanOrEqual(1);
    expect(r.flatDrawdownDepletion).toBeGreaterThanOrEqual(0);
    expect(r.flatDrawdownDepletion).toBeLessThanOrEqual(1);
    expect(r.medianEstateYears).not.toBeNull();
    expect(r.bequestTargetReached).toBeNull(); // no target by default
  });

  it("reports a best constant allocation the glide path barely beats", () => {
    const r = recommendGlidePath(base());
    // Flat weight is on the grid, within [0, maxLeverage].
    expect(r.flatEquityPct).toBeGreaterThanOrEqual(0);
    expect(r.flatEquityPct).toBeLessThanOrEqual(
      r.params.maxLeverage * 100 + 1e-9,
    );
    expect(r.flatCeIncome).toBeGreaterThan(0);
    // The glide path is optimized over a superset of constant paths, so its
    // in-sample edge is real but small — within a few % of the flat CE income.
    expect(r.ceIncome).toBeGreaterThanOrEqual(r.flatCeIncome * 0.98);
  });

  it("keeps the raw optimized glide even when the flat edge is marginal", () => {
    const r = recommendGlidePath(base());
    expect(new Set(r.equityByYear).size).toBeGreaterThan(1);
  });

  it("is deterministic for identical inputs (seeded)", () => {
    const a = recommendGlidePath(base());
    const b = recommendGlidePath(base());
    expect(a.equityByYear).toEqual(b.equityByYear);
    expect(a.ceIncome).toBe(b.ceIncome);
  });

  it("falls back to a bounded path count for invalid direct engine calls", () => {
    const bounded = recommendGlidePath(
      base({ numPaths: Number.POSITIVE_INFINITY }),
    );
    const minimum = recommendGlidePath(base({ numPaths: 200 }));
    expect(bounded.equityByYear).toEqual(minimum.equityByYear);
    expect(bounded.ceIncome).toBe(minimum.ceIncome);
  });

  it("derives the bridge from a later pension start age", () => {
    const r = recommendGlidePath(
      base({ retirementAge: 55, pensionStartAge: 65, planningAge: 95 }),
    );
    expect(r.params.pensionDelayYears).toBe(10);
    expect(r.params.accumYears).toBe(20);
    expect(r.params.retireYears).toBe(40);
  });

  it("computes the pension from pre-retirement income", () => {
    const r = recommendGlidePath(
      base({ pensionPct: 30, preRetirementIncome: 120000 }),
    );
    expect(r.params.guaranteed).toBeCloseTo(36000, 0);
  });

  it("allows leverage (>100% equity) under low risk aversion and cheap borrowing", () => {
    const r = recommendGlidePath(
      base({ gamma: 1.5, maxEquityPct: 150, borrowCost: 0.5 }),
    );
    expect(r.params.maxLeverage).toBeCloseTo(1.5, 6);
    expect(Math.max(...r.equityByYear)).toBeGreaterThan(1.0);
  });

  it("reports the robust flat comparator without replacing the raw optimized glide", () => {
    const r = recommendGlidePath(
      base({
        startAge: 34,
        retirementAge: 60,
        planningAge: 95,
        preRetirementIncome: 120000,
        startSavings: 350000,
        annualContribution: 54000,
        targetIncome: 80000,
        pensionPct: 25,
        pensionStartAge: 70,
        flexibility: 0.25,
        withdrawalRate: 3,
        gamma: 3,
        beta: 0.985,
        maxEquityPct: 150,
        borrowCost: 1,
        interval: 5,
        numPaths: 2000,
        minSpending: 10000, // pinned so the expectation isn't coupled to the default
      }),
    );

    // With the subsistence floor the 10y bridge no longer collapses the CE, so the robust flat
    // comparator is a sane leveraged weight (was a degenerate ~100% before the floor existed).
    expect(r.flatEquityPct).toBe(140);
    expect(r.flatCeIncome).toBeGreaterThan(90000);
    expect(new Set(r.equityByYear).size).toBeGreaterThan(1);
    expect(Math.max(...r.equityByYear)).toBeGreaterThan(1);
  }, 15000);

  it("separates retirement drawdown risk from full-path accumulation risk", () => {
    const r = recommendGlidePath(
      base({
        startAge: 34,
        retirementAge: 61,
        planningAge: 95,
        preRetirementIncome: 100000,
        startSavings: 350000,
        annualContribution: 20000,
        targetIncome: 70000,
        pensionPct: 25,
        pensionStartAge: 70,
        flexibility: 0,
        withdrawalRate: 4,
        gamma: 2,
        beta: 0.985,
        maxEquityPct: 150,
        borrowCost: 1,
        interval: 5,
        numPaths: 2000,
      }),
    );

    expect(r.drawdownDepletion).toBeLessThan(0.1);
    expect(r.depletion).toBeGreaterThan(0.1);
  }, 10000);

  it("keeps equity at/below 100% with no leverage", () => {
    const r = recommendGlidePath(base({ maxEquityPct: 100 }));
    expect(Math.max(...r.equityByYear)).toBeLessThanOrEqual(1.0 + 1e-9);
  });

  // ── subsistence consumption floor (minSpending) ──────────────────────────────
  // A long pre-pension bridge (retire 55, pension at 70) drives consumption to ~$0 in depleted
  // paths; with γ≥2 the CE objective collapses toward the inert $1 floor and the best constant
  // craters to a degenerate low equity weight. A real minSpending floor repairs this.
  const bridge = (minSpending: number): GlidePathInput =>
    base({
      startAge: 34,
      retirementAge: 55,
      planningAge: 95,
      preRetirementIncome: 100000,
      startSavings: 350000,
      annualContribution: 30000,
      targetIncome: 70000,
      pensionPct: 25,
      pensionStartAge: 70,
      flexibility: 0.25,
      withdrawalRate: 4,
      gamma: 2,
      maxEquityPct: 150,
      borrowCost: 1,
      minSpending,
    });

  it("a subsistence floor lifts the bridge recommendation off the degenerate low-equity corner", () => {
    const noFloor = recommendGlidePath(bridge(1)); // ~old $1 behavior
    const withFloor = recommendGlidePath(bridge(20000));
    // Without a real floor the best constant craters (~30%) and the CE collapses to the artifact;
    // the floor restores a sane, much higher weight and a meaningful CE income.
    expect(noFloor.flatEquityPct).toBeLessThan(50);
    expect(withFloor.flatEquityPct).toBeGreaterThan(100);
    expect(withFloor.ceIncome).toBeGreaterThan(noFloor.ceIncome * 3);
  }, 20000);

  it("changes CE but not depletion when only the consumption floor moves (utility-only)", () => {
    // Both floors pick the same best constant (the 150% leverage cap), so its depletion — which
    // uses the numeric FLOOR, not cMin — is identical, while its CE rises with the higher floor.
    // Locks the separation: cMin shapes welfare, never the ruin metric.
    const lo = recommendGlidePath(bridge(20000));
    const hi = recommendGlidePath(bridge(40000));
    expect(lo.flatEquityPct).toBe(hi.flatEquityPct);
    expect(hi.flatDrawdownDepletion).toBeCloseTo(lo.flatDrawdownDepletion, 10);
    expect(hi.flatCeIncome).toBeGreaterThan(lo.flatCeIncome);
  }, 20000);

  it("leaves a no-bridge plan unchanged when the floor is at or below the guaranteed income", () => {
    // Pension at retirement → guaranteed income every year, so a floor ≤ it never binds and the
    // whole recommendation is identical with or without it (the validated analysis is untouched).
    const noBridge = (minSpending: number): GlidePathInput =>
      base({
        startAge: 34,
        retirementAge: 55,
        planningAge: 95,
        preRetirementIncome: 100000,
        startSavings: 350000,
        annualContribution: 30000,
        targetIncome: 70000,
        pensionPct: 25,
        pensionStartAge: 55, // no bridge; guaranteed = 25% × 100k = 25k ≥ floor
        flexibility: 0.25,
        withdrawalRate: 4,
        gamma: 2,
        maxEquityPct: 150,
        borrowCost: 1,
        minSpending,
      });
    const a = recommendGlidePath(noBridge(1));
    const b = recommendGlidePath(noBridge(20000));
    expect(b.flatEquityPct).toBe(a.flatEquityPct);
    expect(b.ceIncome).toBe(a.ceIncome);
    expect(b.drawdownDepletion).toBe(a.drawdownDepletion);
    expect(b.equityByYear).toEqual(a.equityByYear);
  }, 20000);
});
