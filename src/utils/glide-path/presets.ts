/**
 * Defaults and the capital-market curve for the glide-path recommender.
 *
 * Ported from `analysis/glide_path_recommender.py`. The engine optimizes the equity
 * weight at each step by Monte Carlo; these are the editable inputs and the default
 * return/vol curve (the app's PWL / FP-Canada allocation table from presets.ts).
 */

/** Anchor on the allocation curve: [equityWeight (0..1), nominalMean %, vol %]. */
export type AllocAnchor = readonly [number, number, number];

/**
 * Default capital-market curve — the same PWL Capital / FP-Canada numbers the
 * `/retirement` tool uses (nominal % per year; deflated to real with `inflation`).
 */
export const DEFAULT_ALLOC_CURVE: AllocAnchor[] = [
  [1.0, 6.87, 12.57],
  [0.9, 6.59, 11.59],
  [0.8, 6.29, 10.62],
  [0.7, 5.99, 9.68],
  [0.6, 5.67, 8.79],
  [0.5, 5.35, 7.94],
  [0.4, 5.01, 7.17],
  [0.3, 4.66, 6.49],
  [0.2, 4.3, 5.94],
  [0.1, 3.93, 5.56],
  [0.0, 3.55, 5.38],
];

/**
 * Default inputs. Rates are percentages; dollars are today's (real) dollars. The
 * engine-quality fields (interval, numPaths) are exposed because this is a nerds tool.
 */
export const DEFAULTS = {
  // ── About you ─────────────────────────────────────────────
  startAge: 35,
  retirementAge: 65,
  planningAge: 95,
  /** Pre-retirement gross income — the base for the pension %. */
  preRetirementIncome: 100000,
  startSavings: 200000,
  annualContribution: 20000,

  // ── Retirement income ─────────────────────────────────────
  /** Target real annual spending in retirement. */
  targetIncome: 60000,
  /**
   * Guaranteed income (CPP/OAS/DB) in retirement, as a % of pre-retirement income. Assumed to
   * be paid every retirement year (the tool models allocation from the point income has started;
   * a pre-pension "bridge" is out of scope — see Methodology).
   */
  pensionPct: 20,

  // ── Spending & preferences ────────────────────────────────
  /** 0 = constant real $; 1 = fully proportional to the balance; blends between. */
  flexibility: 0,
  /** When spending flexibly, the % of the live balance drawn each year. */
  withdrawalRate: 3.5,
  /** CRRA risk aversion (1 = log, 3 = base, 8 = very cautious). */
  gamma: 3,
  /** Annual time-discount factor. */
  beta: 0.985,
  /** Target estate in YEARS of retirement spending (0 = spend it all). */
  bequestYears: 0,

  // ── Leverage ──────────────────────────────────────────────
  /** Max equity weight as a % (100 = no leverage; 150 = up to 1.5×). */
  maxEquityPct: 100,
  /** Real annual cost of borrowing (used only when maxEquityPct > 100). */
  borrowCost: 2,

  // ── Engine / Monte Carlo ──────────────────────────────────
  /** Years per glide step (1 = per-age, 5 = every 5y; smaller = slower). */
  interval: 5,
  /** Monte Carlo paths (more = steadier, slower). */
  numPaths: 2000,
  /** Inflation used to deflate the curve to real. */
  inflation: 2.1,
} as const;

/** Discrete grid step for the equity-weight search (fraction of equity). */
export const GRID_STEP = 0.05;

/** Risk-aversion presets surfaced as quick buttons. */
export const GAMMA_PRESETS = [1, 2, 3, 5, 8] as const;

/** Spending-flexibility presets (fraction). */
export const FLEX_PRESETS = [
  { value: 0, label: "Constant $" },
  { value: 0.5, label: "Half-flex" },
  { value: 1, label: "Fully flexible" },
] as const;
