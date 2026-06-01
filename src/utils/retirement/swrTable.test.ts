/**
 * SWR calibration check: 60/40 portfolio, 90% success rate.
 * Run with:  npx vitest run src/utils/retirement/swrTable.test.ts
 *
 * Expected values (Morningstar 2024, 60% equity):
 *   20y → 5.2%   25y → 4.3%   30y → 3.8%   35y → 3.4%   40y → 3.2%
 */
import { describe, it } from "vitest";
import { realMean } from "./projection";

// ── MC engine constants (mirrored from monteCarlo.ts) ────────────────────────

const RETURN_AUTOCORRELATION = 0;
const INNOVATION_SCALE = Math.sqrt(
  1 - RETURN_AUTOCORRELATION * RETURN_AUTOCORRELATION,
);
const SEED = 0x9e3779b9;
const NUM_SIMS = 10_000;

const INFLATION = 2.1;

const RETIRE_RETURN_VOL_SETS: Record<
  number,
  { retireReturn: number; retireVolatility: number }
> = {
  40: { retireReturn: 5.01, retireVolatility: 7.17 },
  60: { retireReturn: 5.67, retireVolatility: 8.79 },
  80: { retireReturn: 6.29, retireVolatility: 10.62 },
  100: { retireReturn: 6.87, retireVolatility: 12.57 },
};

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function standardNormal(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function successRate(
  equityPct: number,
  years: number,
  withdrawal: number,
): number {
  const mean = realMean(
    RETIRE_RETURN_VOL_SETS[equityPct].retireReturn,
    INFLATION,
  );
  const sigma = RETIRE_RETURN_VOL_SETS[equityPct].retireVolatility / 100;

  const rand = mulberry32(SEED);
  let successes = 0;
  for (let sim = 0; sim < NUM_SIMS; sim++) {
    let balance = 1.0;
    let depleted = false;
    let deviation = 0;
    for (let i = 0; i < years; i++) {
      deviation =
        RETURN_AUTOCORRELATION * deviation +
        INNOVATION_SCALE * sigma * standardNormal(rand);
      const r = mean + deviation;
      if (!depleted) {
        balance = balance * (1 + r) - withdrawal * (1 + r / 2);
        if (balance <= 0) {
          balance = 0;
          depleted = true;
        }
      }
    }
    if (!depleted) successes++;
  }
  return successes / NUM_SIMS;
}

function findSWR(equityPct: number, years: number, target = 0.9): number {
  let lo = 0.001,
    hi = 0.2;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (successRate(equityPct, years, mid) >= target) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ── Tests ────────────────────────────────────────────────────────────────────

const MORNINGSTAR_SWR_TABLE: Record<number, Record<number, number>> = {
  40: {
    20: 5.3,
    25: 4.4,
    30: 3.9,
    35: 3.5,
    40: 3.2,
  },
  60: {
    20: 5.2,
    25: 4.3,
    30: 3.8,
    35: 3.4,
    40: 3.2,
  },
  80: {
    20: 4.9,
    25: 4.1,
    30: 3.6,
    35: 3.3,
    40: 3.1,
  },
  100: {
    20: 4.6,
    25: 3.8,
    30: 3.4,
    35: 3.2,
    40: 3.0,
  },
};

describe("SWR calibration – 40/60, 90% success", () => {
  const testEquityAllocation = 40;
  const results: { horizon: number; appSWR: number; morningstar: number }[] =
    [];

  for (const horizon of [20, 25, 30, 35, 40]) {
    it(`${horizon}-year horizon vs Morningstar`, () => {
      const swr = findSWR(testEquityAllocation, horizon) * 100;
      const ms = MORNINGSTAR_SWR_TABLE[testEquityAllocation][horizon];
      results.push({ horizon, appSWR: swr, morningstar: ms });

      console.log(
        `${testEquityAllocation}% equity  ${horizon}y  app=${swr.toFixed(2)}%  morningstar=${ms}%  delta=${(swr - ms).toFixed(2)}%`,
      );
    });
  }
});

describe("SWR calibration – 60/40, 90% success", () => {
  const testEquityAllocation = 60;
  const results: { horizon: number; appSWR: number; morningstar: number }[] =
    [];

  for (const horizon of [20, 25, 30, 35, 40]) {
    it(`${horizon}-year horizon vs Morningstar`, () => {
      const swr = findSWR(testEquityAllocation, horizon) * 100;
      const ms = MORNINGSTAR_SWR_TABLE[testEquityAllocation][horizon];
      results.push({ horizon, appSWR: swr, morningstar: ms });

      console.log(
        `${testEquityAllocation}% equity  ${horizon}y  app=${swr.toFixed(2)}%  morningstar=${ms}%  delta=${(swr - ms).toFixed(2)}%`,
      );
    });
  }
});

describe("SWR calibration – 80/20, 90% success", () => {
  const testEquityAllocation = 80;
  const results: { horizon: number; appSWR: number; morningstar: number }[] =
    [];

  for (const horizon of [20, 25, 30, 35, 40]) {
    it(`${horizon}-year horizon vs Morningstar`, () => {
      const swr = findSWR(testEquityAllocation, horizon) * 100;
      const ms = MORNINGSTAR_SWR_TABLE[testEquityAllocation][horizon];
      results.push({ horizon, appSWR: swr, morningstar: ms });

      console.log(
        `${testEquityAllocation}% equity  ${horizon}y  app=${swr.toFixed(2)}%  morningstar=${ms}%  delta=${(swr - ms).toFixed(2)}%`,
      );
    });
  }
});

describe("SWR calibration – 100/20, 90% success", () => {
  const testEquityAllocation = 100;
  const results: { horizon: number; appSWR: number; morningstar: number }[] =
    [];

  for (const horizon of [20, 25, 30, 35, 40]) {
    it(`${horizon}-year horizon vs Morningstar`, () => {
      const swr = findSWR(testEquityAllocation, horizon) * 100;
      const ms = MORNINGSTAR_SWR_TABLE[testEquityAllocation][horizon];
      results.push({ horizon, appSWR: swr, morningstar: ms });

      console.log(
        `${testEquityAllocation}% equity  ${horizon}y  app=${swr.toFixed(2)}%  morningstar=${ms}%  delta=${(swr - ms).toFixed(2)}%`,
      );
    });
  }
});
