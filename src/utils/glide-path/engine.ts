/**
 * Glide-path recommender engine — TypeScript port of `analysis/glide_path_recommender.py`.
 *
 * Optimizes the equity weight at each interval step by Monte Carlo coordinate ascent under
 * common random numbers, maximizing expected discounted CRRA utility of retirement
 * consumption. Real (today's) dollars; iid normal returns; mid-year cash flow earns a
 * half-year; a depleted portfolio absorbs at zero. Guaranteed income (pension) is paid every
 * retirement year. Supports a bequest target (in years of spending) and leverage (equity
 * weight > 1, borrowing at a real cost).
 *
 * The hot path (`meanUtility`) runs on grid-index arrays with precomputed per-grid (mean, vol)
 * so the inner loop is plain float math. Intended to run inside a Web Worker.
 */

import { fillNormals } from "./rng";
import { DEFAULT_ALLOC_CURVE, GRID_STEP, type AllocAnchor } from "./presets";
import type {
  GlidePathInput,
  GlidePathResult,
  ScheduleBlock,
  SlopeDir,
} from "./types";

const FLOOR = 1.0; // numerical floor on consumption / estate (real $); a numerical guard, not a
// spending-floor assumption (consumption can't approach it while guaranteed income is paid)
const FLAT_BAND = 0.1; // |Δ equity| within this is "Flat"
const SEED = 0x9e3779b9;
const STATS_SEED = 0x85ebca6b;
const CAL_SEED = 0xc2b2ae35;
const CAL_EVAL_SEED = 0x27d4eb2f;
const MIN_OPT_PATHS = 200;
const MAX_OPT_PATHS = 10000;
const MAX_STATS_PATHS = 8000;
const MAX_CAL_PATHS = 1500;
const MAX_CAL_EVAL_PATHS = 6000;

// ── small numeric helpers ─────────────────────────────────────────────────────
function realMean(nominalPct: number, inflationPct: number): number {
  return (1 + nominalPct / 100) / (1 + inflationPct / 100) - 1;
}

/** Linear interpolation on ascending `xs`, clamped at the endpoints. */
function interp(x: number, xs: number[], ys: number[]): number {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let hi = 1;
  while (hi < n && xs[hi] < x) hi++;
  const lo = hi - 1;
  const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
  return ys[lo] + t * (ys[hi] - ys[lo]);
}

/** Median of a numeric array (mutates a copy). */
function median(values: Float64Array): number {
  const arr = Array.from(values).sort((a, b) => a - b);
  const m = arr.length >> 1;
  return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
}

function ceFromUtil(u: number, gamma: number): number {
  if (Math.abs(gamma - 1) < 1e-9) return Math.exp(u);
  return Math.pow((1 - gamma) * u, 1 / (1 - gamma));
}

// ── return curve → per-grid (real mean, vol) ──────────────────────────────────
/**
 * Precompute (real mean, vol) for every grid weight. For w > 1 (leverage): borrow (w-1)
 * at the real `borrowCostPct` to hold w in the all-equity portfolio — real mean
 * w·eq − (w−1)·borrow, vol w·eqVol.
 */
function buildGridStats(
  grid: Float64Array,
  curve: AllocAnchor[],
  inflationPct: number,
  borrowCostPct: number,
): { gridMean: Float64Array; gridVol: Float64Array } {
  const sorted = [...curve].sort((a, b) => a[0] - b[0]);
  const cw = sorted.map((t) => t[0]);
  const cmReal = sorted.map((t) => realMean(t[1], inflationPct));
  const cv = sorted.map((t) => t[2] / 100);
  const eqMean = interp(1, cw, cmReal);
  const eqVol = interp(1, cw, cv);
  const borrowReal = borrowCostPct / 100;

  const gridMean = new Float64Array(grid.length);
  const gridVol = new Float64Array(grid.length);
  for (let g = 0; g < grid.length; g++) {
    const w = grid[g];
    if (w > 1) {
      gridMean[g] = w * eqMean - (w - 1) * borrowReal;
      gridVol[g] = w * eqVol;
    } else {
      gridMean[g] = interp(w, cw, cmReal);
      gridVol[g] = interp(w, cw, cv);
    }
  }
  return { gridMean, gridVol };
}

// ── simulation context ────────────────────────────────────────────────────────
interface SimCtx {
  gridMean: Float64Array;
  gridVol: Float64Array;
  accumYears: number;
  retireYears: number;
  disc: Float64Array; // beta^t, length retireYears
  gapArr: Float64Array; // portfolio-funded gap per retirement year
  guarArr: Float64Array; // guaranteed income per retirement year
  flex: number;
  wr: number; // proportional withdrawal rate (fraction)
  contrib: number;
  startSavings: number;
  isLog: boolean; // gamma == 1
  oneMinusGamma: number;
  invOneMinusGamma: number;
  bequestW: number;
  bequestFloor: number;
}

/**
 * Mean discounted utility over `n` paths for a per-year grid-index path. The single
 * inner kernel for both the flat init and the per-block grid search.
 */
function meanUtility(
  yearIdx: Int32Array,
  ctx: SimCtx,
  Z: Float64Array,
  n: number,
): number {
  const {
    gridMean,
    gridVol,
    accumYears,
    retireYears,
    disc,
    gapArr,
    guarArr,
    flex,
    wr,
    contrib,
    startSavings,
    isLog,
    oneMinusGamma,
    invOneMinusGamma,
    bequestW,
    bequestFloor,
  } = ctx;
  let sum = 0;
  for (let p = 0; p < n; p++) {
    let bal = startSavings;
    for (let i = 0; i < accumYears; i++) {
      const idx = yearIdx[i];
      const r = gridMean[idx] + gridVol[idx] * Z[i * n + p];
      const grown = bal * (1 + r);
      bal = (grown < 0 ? 0 : grown) + contrib * (1 + r / 2);
    }
    let eu = 0;
    for (let t = 0; t < retireYears; t++) {
      const i = accumYears + t;
      const idx = yearIdx[i];
      const r = gridMean[idx] + gridVol[idx] * Z[i * n + p];
      let grown = bal * (1 + r);
      if (grown < 0) grown = 0;
      const target = (1 - flex) * gapArr[t] + flex * (wr * bal);
      const afford = grown / (1 + r / 2);
      const wdr = target < afford ? target : afford;
      bal = grown - wdr * (1 + r / 2);
      let c = guarArr[t] + wdr;
      if (c < FLOOR) c = FLOOR;
      eu +=
        disc[t] *
        (isLog ? Math.log(c) : Math.pow(c, oneMinusGamma) * invOneMinusGamma);
    }
    if (bequestW > 0) {
      let b = bal + bequestFloor;
      if (b < FLOOR) b = FLOOR;
      eu +=
        bequestW *
        disc[retireYears - 1] *
        (isLog ? Math.log(b) : Math.pow(b, oneMinusGamma) * invOneMinusGamma);
    }
    sum += eu;
  }
  return sum / n;
}

interface PathStats {
  ceIncome: number;
  depletion: number;
  incomeCv: number;
  medianBequest: number;
}

interface DrawdownStats extends PathStats {
  startBalance: number;
}

/** Out-of-sample outcome stats for a fixed per-year path (CE income, depletion, CV, estate). */
function computeStats(
  yearIdx: Int32Array,
  ctx: SimCtx,
  Z: Float64Array,
  n: number,
  gamma: number,
): PathStats {
  const {
    gridMean,
    gridVol,
    accumYears,
    retireYears,
    disc,
    gapArr,
    guarArr,
    flex,
    wr,
    contrib,
    startSavings,
    isLog,
    oneMinusGamma,
    invOneMinusGamma,
  } = ctx;
  let discSum = 0;
  for (let t = 0; t < retireYears; t++) discSum += disc[t];

  let consEuSum = 0;
  let cvSum = 0;
  let depCount = 0;
  const finals = new Float64Array(n);

  for (let p = 0; p < n; p++) {
    let bal = startSavings;
    for (let i = 0; i < accumYears; i++) {
      const idx = yearIdx[i];
      const r = gridMean[idx] + gridVol[idx] * Z[i * n + p];
      const grown = bal * (1 + r);
      bal = (grown < 0 ? 0 : grown) + contrib * (1 + r / 2);
    }
    let consEu = 0;
    let sumC = 0;
    let sumC2 = 0;
    let depleted = false;
    for (let t = 0; t < retireYears; t++) {
      const i = accumYears + t;
      const idx = yearIdx[i];
      const r = gridMean[idx] + gridVol[idx] * Z[i * n + p];
      let grown = bal * (1 + r);
      if (grown < 0) grown = 0;
      const target = (1 - flex) * gapArr[t] + flex * (wr * bal);
      const afford = grown / (1 + r / 2);
      const wdr = target < afford ? target : afford;
      bal = grown - wdr * (1 + r / 2);
      let c = guarArr[t] + wdr;
      if (c < FLOOR) c = FLOOR;
      consEu +=
        disc[t] *
        (isLog ? Math.log(c) : Math.pow(c, oneMinusGamma) * invOneMinusGamma);
      sumC += c;
      sumC2 += c * c;
      if (bal <= FLOOR) depleted = true;
    }
    consEuSum += consEu;
    const tMean = sumC / retireYears;
    const tVar = sumC2 / retireYears - tMean * tMean;
    cvSum += (tVar > 0 ? Math.sqrt(tVar) : 0) / tMean;
    if (depleted) depCount++;
    finals[p] = bal;
  }

  return {
    ceIncome: ceFromUtil(consEuSum / n / discSum, gamma),
    depletion: depCount / n,
    incomeCv: cvSum / n,
    medianBequest: median(finals),
  };
}

function deterministicAccumBalance(yearIdx: Int32Array, ctx: SimCtx): number {
  const { gridMean, accumYears, contrib, startSavings } = ctx;
  let bal = startSavings;
  for (let i = 0; i < accumYears; i++) {
    const r = gridMean[yearIdx[i]];
    const grown = bal * (1 + r);
    bal = (grown < 0 ? 0 : grown) + contrib * (1 + r / 2);
  }
  return bal;
}

/**
 * Retirement-phase stats conditional on reaching the deterministic mean-return balance
 * at retirement. This matches the `/retirement` tool's headline success-rate semantics;
 * `computeStats` above is the full path from today and includes accumulation market luck.
 */
function computeDrawdownStats(
  yearIdx: Int32Array,
  ctx: SimCtx,
  Z: Float64Array,
  n: number,
  gamma: number,
): DrawdownStats {
  const {
    gridMean,
    gridVol,
    accumYears,
    retireYears,
    disc,
    gapArr,
    guarArr,
    flex,
    wr,
    isLog,
    oneMinusGamma,
    invOneMinusGamma,
  } = ctx;
  let discSum = 0;
  for (let t = 0; t < retireYears; t++) discSum += disc[t];

  const startBalance = deterministicAccumBalance(yearIdx, ctx);
  let consEuSum = 0;
  let cvSum = 0;
  let depCount = 0;
  const finals = new Float64Array(n);

  for (let p = 0; p < n; p++) {
    let bal = startBalance;
    let consEu = 0;
    let sumC = 0;
    let sumC2 = 0;
    let depleted = false;
    for (let t = 0; t < retireYears; t++) {
      const i = accumYears + t;
      const idx = yearIdx[i];
      const r = gridMean[idx] + gridVol[idx] * Z[i * n + p];
      let grown = bal * (1 + r);
      if (grown < 0) grown = 0;
      const target = (1 - flex) * gapArr[t] + flex * (wr * bal);
      const afford = grown / (1 + r / 2);
      const wdr = target < afford ? target : afford;
      bal = grown - wdr * (1 + r / 2);
      let c = guarArr[t] + wdr;
      if (c < FLOOR) c = FLOOR;
      consEu +=
        disc[t] *
        (isLog ? Math.log(c) : Math.pow(c, oneMinusGamma) * invOneMinusGamma);
      sumC += c;
      sumC2 += c * c;
      if (bal <= FLOOR) depleted = true;
    }
    consEuSum += consEu;
    const tMean = sumC / retireYears;
    const tVar = sumC2 / retireYears - tMean * tMean;
    cvSum += (tVar > 0 ? Math.sqrt(tVar) : 0) / tMean;
    if (depleted) depCount++;
    finals[p] = bal;
  }

  return {
    ceIncome: ceFromUtil(consEuSum / n / discSum, gamma),
    depletion: depCount / n,
    incomeCv: cvSum / n,
    medianBequest: median(finals),
    startBalance,
  };
}

// ── coordinate ascent ─────────────────────────────────────────────────────────
function optimize(
  ctx: SimCtx,
  Z: Float64Array,
  n: number,
  G: number,
  blockStart: Int32Array,
  blockEnd: Int32Array,
  blockOfYear: Int32Array,
  maxPasses: number,
): Int32Array {
  const nYears = ctx.accumYears + ctx.retireYears;
  const nBlocks = blockStart.length;
  const yearIdx = new Int32Array(nYears);

  // Flat init: the best single weight applied to every year (shape-neutral start).
  let bestFlat = -Infinity;
  let bestFlatG = 0;
  for (let g = 0; g < G; g++) {
    yearIdx.fill(g);
    const u = meanUtility(yearIdx, ctx, Z, n);
    if (u > bestFlat) {
      bestFlat = u;
      bestFlatG = g;
    }
  }
  const blockIdx = new Int32Array(nBlocks).fill(bestFlatG);
  for (let i = 0; i < nYears; i++) yearIdx[i] = blockIdx[blockOfYear[i]];

  for (let pass = 0; pass < maxPasses; pass++) {
    const forward = pass % 2 === 0;
    let changed = false;
    for (let k = 0; k < nBlocks; k++) {
      const b = forward ? k : nBlocks - 1 - k;
      const s = blockStart[b];
      const e = blockEnd[b];
      let bestU = -Infinity;
      let bestG = blockIdx[b];
      for (let g = 0; g < G; g++) {
        for (let i = s; i < e; i++) yearIdx[i] = g;
        const u = meanUtility(yearIdx, ctx, Z, n);
        if (u > bestU) {
          bestU = u;
          bestG = g;
        }
      }
      for (let i = s; i < e; i++) yearIdx[i] = bestG;
      if (bestG !== blockIdx[b]) {
        blockIdx[b] = bestG;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return blockIdx;
}

function expand(
  blockIdx: Int32Array,
  blockOfYear: Int32Array,
  nYears: number,
): Int32Array {
  const yearIdx = new Int32Array(nYears);
  for (let i = 0; i < nYears; i++) yearIdx[i] = blockIdx[blockOfYear[i]];
  return yearIdx;
}

function classify(d: number): SlopeDir {
  return d > FLAT_BAND ? "Rising" : d < -FLAT_BAND ? "Falling" : "Flat";
}

function clampPathCount(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Regular search grid that never exceeds the requested cap. */
export function buildEquityGrid(maxLeverage: number): Float64Array {
  const fullSteps = Math.floor((maxLeverage + 1e-9) / GRID_STEP);
  const grid = new Float64Array(fullSteps + 1);

  for (let g = 0; g <= fullSteps; g++)
    grid[g] = Math.round(g * GRID_STEP * 1e6) / 1e6;

  return grid;
}

// ── public entry point ────────────────────────────────────────────────────────
/**
 * Recommend the welfare-maximizing equity glide path for the given inputs. Pure and
 * deterministic (seeded). Runs the optimizer, an optional bequest calibration, and the
 * out-of-sample stats. Intended to be called from the Web Worker.
 */
export function recommendGlidePath(
  input: GlidePathInput,
  curve: AllocAnchor[] = DEFAULT_ALLOC_CURVE,
): GlidePathResult {
  const accumYears = Math.max(
    1,
    Math.round(input.retirementAge - input.startAge),
  );
  const retireYears = Math.max(
    1,
    Math.round(input.planningAge - input.retirementAge),
  );
  const nYears = accumYears + retireYears;
  const interval = Math.max(1, Math.round(input.interval));
  const gamma = input.gamma;
  const maxLeverage = Math.max(GRID_STEP, input.maxEquityPct / 100);

  // Grid of candidate equity weights 0..maxLeverage (weights > 1 are leveraged).
  const grid = buildEquityGrid(maxLeverage);
  const G = grid.length;
  const { gridMean, gridVol } = buildGridStats(
    grid,
    curve,
    input.inflation,
    input.borrowCost,
  );

  // Guaranteed income (pension) is paid every retirement year; the portfolio funds the gap.
  const guaranteed = (input.pensionPct / 100) * input.preRetirementIncome;
  const gap = Math.max(input.targetIncome - guaranteed, 0);
  const guarArr = new Float64Array(retireYears).fill(guaranteed);
  const gapArr = new Float64Array(retireYears).fill(gap);
  const disc = new Float64Array(retireYears);
  for (let t = 0; t < retireYears; t++) disc[t] = Math.pow(input.beta, t);

  // Block layout: equity is constant within each interval block; the last absorbs the remainder.
  const nBlocks = Math.ceil(nYears / interval);
  const blockOfYear = new Int32Array(nYears);
  const blockStart = new Int32Array(nBlocks);
  const blockEnd = new Int32Array(nBlocks);
  for (let i = 0; i < nYears; i++)
    blockOfYear[i] = Math.min(Math.floor(i / interval), nBlocks - 1);
  for (let b = 0; b < nBlocks; b++) {
    blockStart[b] = b * interval;
    blockEnd[b] = b < nBlocks - 1 ? (b + 1) * interval : nYears;
  }

  const ctxBase: Omit<SimCtx, "bequestW"> = {
    gridMean,
    gridVol,
    accumYears,
    retireYears,
    disc,
    gapArr,
    guarArr,
    flex: input.flexibility,
    wr: input.withdrawalRate / 100,
    contrib: input.annualContribution,
    startSavings: input.startSavings,
    isLog: Math.abs(gamma - 1) < 1e-9,
    oneMinusGamma: 1 - gamma,
    invOneMinusGamma: 1 / (1 - gamma),
    bequestFloor: 10000,
  };

  const nOpt = clampPathCount(input.numPaths, MIN_OPT_PATHS, MAX_OPT_PATHS);
  const passes = 6;
  const Z = fillNormals(SEED, nYears * nOpt);

  // ── optional bequest calibration (target estate in years of spending) ────────
  // Search only sets the warm-glow weight here; whether the target is actually reached is
  // decided later from the FINAL optimized path's out-of-sample median estate (below), so the
  // reported flag can never contradict the median estate the UI shows.
  let bequestW = 0;
  if (input.bequestYears > 0) {
    const targetEstate = input.bequestYears * input.targetIncome;
    const nCal = Math.min(nOpt, MAX_CAL_PATHS);
    const nCalEval = Math.max(nCal, MAX_CAL_EVAL_PATHS);
    const Zc = fillNormals(CAL_SEED, nYears * nCal);
    const Zce = fillNormals(CAL_EVAL_SEED, nYears * nCalEval);
    const medEstate = (bw: number): number => {
      const ctx: SimCtx = { ...ctxBase, bequestW: bw };
      const bi = optimize(
        ctx,
        Zc,
        nCal,
        G,
        blockStart,
        blockEnd,
        blockOfYear,
        4,
      );
      return computeStats(
        expand(bi, blockOfYear, nYears),
        ctx,
        Zce,
        nCalEval,
        gamma,
      ).medianBequest;
    };
    const natural = medEstate(0);
    if (targetEstate <= natural) {
      bequestW = 0;
    } else {
      const cap = 200;
      let lo = 0;
      let hi = 25;
      let estHi = medEstate(hi);
      while (estHi < targetEstate && hi < cap) {
        lo = hi;
        hi = Math.min(hi * 2, cap);
        estHi = medEstate(hi);
      }
      if (estHi < targetEstate) {
        bequestW = hi;
      } else {
        for (let it = 0; it < 8; it++) {
          const mid = 0.5 * (lo + hi);
          if (medEstate(mid) < targetEstate) lo = mid;
          else hi = mid;
        }
        bequestW = 0.5 * (lo + hi);
      }
    }
  }

  // ── final optimization + out-of-sample stats ─────────────────────────────────
  const ctx: SimCtx = { ...ctxBase, bequestW };
  const blockIdx = optimize(
    ctx,
    Z,
    nOpt,
    G,
    blockStart,
    blockEnd,
    blockOfYear,
    passes,
  );
  const yearIdx = expand(blockIdx, blockOfYear, nYears);
  const weights: number[] = [];
  for (let i = 0; i < nYears; i++) weights.push(grid[yearIdx[i]]);

  // Stats paths are capped independently — no reason to run more than 8k out-of-sample
  // paths just because the user cranked up numPaths for the optimizer.
  const nStats = MAX_STATS_PATHS;
  const Zf = fillNormals(STATS_SEED, nYears * nStats);
  const st = computeStats(yearIdx, ctx, Zf, nStats, gamma);
  const drawdownSt = computeDrawdownStats(yearIdx, ctx, Zf, nStats, gamma);

  // Estate-goal attainment, judged on the returned/charted path's out-of-sample median estate
  // (not the calibration's separate sample/optimization) so it agrees with the median the UI
  // shows. null when there is no estate goal.
  const bequestTargetReached =
    input.bequestYears > 0
      ? st.medianBequest >= input.bequestYears * input.targetIncome
      : null;

  // ── best single constant (flat) equity weight ────────────────────────────────
  // The glide path's edge over the best *constant* allocation is typically tiny, so we
  // report that simpler alternative for the UI to quantify the gap and recommend the
  // behaviorally-stickier flat weight. Choose it by out-of-sample CE income, not the
  // in-sample optimization matrix; tail-sensitive utility plus leverage can otherwise
  // overfit rare bad paths and pick a fragile constant weight. The raw optimized glide
  // is still returned and charted; the UI can recommend this flatter comparator when
  // it is materially better.
  const flatIdx = new Int32Array(nYears);
  let bestFlatG = 0;
  let flatStats = computeStats(flatIdx, ctx, Zf, nStats, gamma);
  for (let g = 1; g < G; g++) {
    flatIdx.fill(g);
    const candidate = computeStats(flatIdx, ctx, Zf, nStats, gamma);
    if (candidate.ceIncome > flatStats.ceIncome) {
      flatStats = candidate;
      bestFlatG = g;
    }
  }
  flatIdx.fill(bestFlatG);
  const flatDrawdownStats = computeDrawdownStats(
    flatIdx,
    ctx,
    Zf,
    nStats,
    gamma,
  );

  // ── schedule + shape descriptors ─────────────────────────────────────────────
  const schedule: ScheduleBlock[] = [];
  for (let b = 0; b < nBlocks; b++) {
    const yearStart = b * interval;
    const yearEnd = Math.min((b + 1) * interval, nYears) - 1;
    schedule.push({
      step: b,
      yearStart,
      yearEnd,
      ageStart: input.startAge + yearStart,
      phase: yearStart < accumYears ? "accum" : "retire",
      equityPct: Math.round(grid[blockIdx[b]] * 1000) / 10,
    });
  }

  const acc = weights.slice(0, accumYears);
  const ret = weights.slice(accumYears);
  const twin = Math.min(15, retireYears);
  let tentI = 0;
  for (let i = 1; i < twin; i++) if (ret[i] < ret[tentI]) tentI = i;
  // Classify a phase by its first-to-last change. We optionally drop the final year: with no
  // bequest the optimizer drives equity toward 0 in the last retirement year(s) (a fixed-horizon
  // artifact, not advice), which would otherwise skew the read. That artifact is retirement-only
  // and bequest-only, so trim *only* the retirement phase and *only* when there's no estate motive
  // — accumulation has no such artifact, and a bequest keeps terminal equity meaningful.
  const slope = (w: number[], trimLast: boolean): SlopeDir => {
    const eff = trimLast && w.length >= 3 ? w.slice(0, -1) : w;
    return eff.length >= 2 ? classify(eff[eff.length - 1] - eff[0]) : "n/a";
  };
  const accumDir = slope(acc, false);
  const retireDir = slope(ret, bequestW === 0);

  return {
    schedule,
    equityByYear: weights.map((w) => Math.round(w * 1e4) / 1e4),
    accumDir,
    retireDir,
    tentPct: retireYears ? Math.round(ret[tentI] * 1000) / 10 : null,
    tentAge: retireYears ? input.startAge + accumYears + tentI : null,
    ceIncome: Math.round(st.ceIncome),
    flatEquityPct: Math.round(grid[bestFlatG] * 1000) / 10,
    flatCeIncome: Math.round(flatStats.ceIncome),
    depletion: Math.round(st.depletion * 1e4) / 1e4,
    drawdownDepletion: Math.round(drawdownSt.depletion * 1e4) / 1e4,
    expectedRetirementBalance: Math.round(drawdownSt.startBalance),
    flatDepletion: Math.round(flatStats.depletion * 1e4) / 1e4,
    flatDrawdownDepletion: Math.round(flatDrawdownStats.depletion * 1e4) / 1e4,
    incomeCv: Math.round(st.incomeCv * 1e4) / 1e4,
    medianBequest: Math.round(st.medianBequest),
    medianEstateYears:
      input.targetIncome > 0
        ? Math.round((st.medianBequest / input.targetIncome) * 10) / 10
        : null,
    bequestTargetReached,
    params: {
      accumYears,
      retireYears,
      guaranteed,
      maxLeverage,
      borrowCost: input.borrowCost,
      bequestWeight: Math.round(bequestW * 1000) / 1000,
      gamma,
      interval,
    },
  };
}
