export const WITHDRAWAL_RATE_PRESETS = [
  {
    id: "20-year",
    label: "4%",
    horizonYears: 20,
    rate: 4,
  },
  {
    id: "30-year",
    label: "3.75%",
    horizonYears: 30,
    rate: 3.75,
  },
  {
    id: "40-year",
    label: "3.5%",
    horizonYears: 40,
    rate: 3.5,
  },
  {
    id: "50-year",
    label: "3.25%",
    horizonYears: 50,
    rate: 3.25,
  },
] as const;

export const RETURN_PRESETS = [
  {
    id: "glide-path-100-0-to-80-20",
    label: "100/0 to 80/20",
    accumReturn: 6.9,
    retireReturn: 6.3,
  },
  {
    id: "glide-path-100-0-to-60-40",
    label: "100/0 to 60/40",
    accumReturn: 6.9,
    retireReturn: 5.7,
  },
  {
    id: "glide-path-80-20",
    label: "80/20",
    accumReturn: 6.3,
    retireReturn: 6.3,
  },
  {
    id: "glide-path-80-20-to-60-40",
    label: "80/20 to 60/40",
    accumReturn: 6.3,
    retireReturn: 5.7,
  },
  {
    id: "glide-path-80-20-to-40-60",
    label: "80/20 to 40/60",
    accumReturn: 6.3,
    retireReturn: 5,
  },
  {
    id: "glide-path-60-40",
    label: "60/40",
    accumReturn: 5.7,
    retireReturn: 5.7,
  },
] as const;

/**
 * Default numeric inputs for the retirement planner. Rates are stored as
 * percentages. Dollar amounts are in today's dollars.
 */
export const DEFAULTS = {
  currentAge: 35,
  planningAge: 95,
  currentSavings: 200000,
  currentIncome: 100000,
  /** Annual savings rate, as a % of current income. 15% of $100k = $15k/yr. */
  contributionPct: 20,
  /** Target gross retirement income, as a % of current income (replacement ratio). */
  targetIncomePct: 60,
  /** Guaranteed retirement income (CPP + OAS + DB pensions), as a % of income. Gross/taxable. */
  guaranteedIncomePct: 10,
  /** Expected nominal return while still working (accumulation), % per year. */
  accumReturn: 6.3,
  /** Expected nominal return in retirement (typically more conservative), %. */
  retireReturn: 5.7,
  inflationRate: 2.1,
  /** Maximum first-year withdrawal as a % of savings at retirement. */
  swr: WITHDRAWAL_RATE_PRESETS.find((p) => p.id === "30-year")!.rate,
} as const;

export type WithdrawalRatePreset = (typeof WITHDRAWAL_RATE_PRESETS)[number];
export type ReturnPreset = (typeof RETURN_PRESETS)[number];
export type ReturnPresetId = ReturnPreset["id"];

export function getWithdrawalRatePresetForHorizon(
  horizonYears: number,
): WithdrawalRatePreset {
  return (
    WITHDRAWAL_RATE_PRESETS.find(
      (preset) => horizonYears <= preset.horizonYears,
    ) ?? WITHDRAWAL_RATE_PRESETS[WITHDRAWAL_RATE_PRESETS.length - 1]
  );
}

export function getReturnPresetById(
  id: ReturnPresetId | null,
): ReturnPreset | undefined {
  if (id === null) return undefined;
  return RETURN_PRESETS.find((preset) => preset.id === id);
}
