import { describe, expect, it } from "vitest";
import { DEFAULTS } from "./presets";
import { buildEquityGrid, recommendGlidePath } from "./engine";
import type { GlidePathInput } from "./types";

// Fast settings for tests: few paths, coarse interval.
const base = (overrides: Partial<GlidePathInput> = {}): GlidePathInput => ({
  ...DEFAULTS,
  numPaths: 600,
  interval: 10,
  ...overrides,
});

describe("recommendGlidePath", () => {
  it("stays on the 5% grid without exceeding a max-equity cap", () => {
    const grid = Array.from(buildEquityGrid(1.18));

    expect(grid.at(-1)).toBe(1.15);
    expect(Math.max(...grid)).toBe(1.15);
  });

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

  it("pays the pension every retirement year (no bridge)", () => {
    // Guaranteed income starts at retirement, so no year funds the full target alone.
    const r = recommendGlidePath(
      base({ retirementAge: 55, planningAge: 95, pensionPct: 25 }),
    );
    expect(r.params.accumYears).toBe(20);
    expect(r.params.retireYears).toBe(40);
    expect(r.params.guaranteed).toBeCloseTo(25000, 0);
  });

  it("computes the pension from pre-retirement income", () => {
    const r = recommendGlidePath(
      base({ pensionPct: 30, preRetirementIncome: 120000 }),
    );
    expect(r.params.guaranteed).toBeCloseTo(36000, 0);
  });

  it("lowers recommended equity as risk aversion rises", () => {
    // The constant-$ shape is fairly γ-invariant, but the overall equity level should not
    // increase with γ — a more cautious investor never gets a more aggressive recommendation.
    const cautious = recommendGlidePath(base({ gamma: 8, maxEquityPct: 100 }));
    const aggressive = recommendGlidePath(
      base({ gamma: 1, maxEquityPct: 100 }),
    );
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(avg(cautious.equityByYear)).toBeLessThanOrEqual(
      avg(aggressive.equityByYear) + 1e-9,
    );
  });

  it("allows leverage (>100% equity) under low risk aversion and cheap borrowing", () => {
    const r = recommendGlidePath(
      base({ gamma: 1.5, maxEquityPct: 150, borrowCost: 0.5 }),
    );
    expect(r.params.maxLeverage).toBeCloseTo(1.5, 6);
    expect(Math.max(...r.equityByYear)).toBeGreaterThan(1.0);
  });

  it("never exceeds a max-equity cap between grid steps", () => {
    const r = recommendGlidePath(
      base({ gamma: 1.5, maxEquityPct: 118, borrowCost: 0.5 }),
    );

    expect(Math.max(...r.equityByYear)).toBeLessThanOrEqual(1.15);
    expect(r.flatEquityPct).toBeLessThanOrEqual(115);
  });

  it("keeps equity at/below 100% with no leverage", () => {
    const r = recommendGlidePath(base({ maxEquityPct: 100 }));
    expect(Math.max(...r.equityByYear)).toBeLessThanOrEqual(1.0 + 1e-9);
  });
});
