import { DEFAULTS } from "./presets";
import type { GlidePathInput, GlidePathInputKey } from "./types";

const KEY = "glide_input";

interface LegacyGlidePathInput extends Partial<GlidePathInput> {
  interval?: number;
  pensionPct?: number;
  preRetirementIncome?: number;
}

export function loadInput(): GlidePathInput {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as LegacyGlidePathInput;
    const current = Object.fromEntries(
      (Object.keys(DEFAULTS) as GlidePathInputKey[])
        .filter((key) => typeof parsed[key] === "number")
        .map((key) => [key, parsed[key]]),
    ) as Partial<GlidePathInput>;
    const guaranteedIncome =
      typeof current.guaranteedIncome === "number"
        ? current.guaranteedIncome
        : typeof parsed.pensionPct === "number"
          ? (parsed.pensionPct / 100) *
            (typeof parsed.preRetirementIncome === "number"
              ? parsed.preRetirementIncome
              : 100000)
          : DEFAULTS.guaranteedIncome;
    return { ...DEFAULTS, ...current, guaranteedIncome };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveInput(input: GlidePathInput): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(input));
  } catch {
    // localStorage may be unavailable (private mode, quota); ignore.
  }
}
