import { DEFAULTS } from "./presets";
import type { RetirementInput, WithdrawalRateMode } from "./types";

const KEY = "ret_input";
const WITHDRAWAL_RATE_MODE_KEY = "ret_withdrawal_rate_mode";

export function loadInput(): RetirementInput {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<RetirementInput>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveInput(input: RetirementInput): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(input));
  } catch {
    // localStorage may be unavailable (private mode, quota); ignore.
  }
}

export function loadWithdrawalRateMode(
  fallback: WithdrawalRateMode,
): WithdrawalRateMode {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(WITHDRAWAL_RATE_MODE_KEY);
    return raw === "auto" || raw === "custom" ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function saveWithdrawalRateMode(mode: WithdrawalRateMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WITHDRAWAL_RATE_MODE_KEY, mode);
  } catch {
    // localStorage may be unavailable (private mode, quota); ignore.
  }
}
