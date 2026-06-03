import { DEFAULTS } from "./presets";
import type { GlidePathInput } from "./types";

const KEY = "glide_input";

export function loadInput(): GlidePathInput {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<GlidePathInput>;
    return { ...DEFAULTS, ...parsed };
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
