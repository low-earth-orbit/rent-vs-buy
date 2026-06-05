import { describe, expect, it } from "vitest";
import { DEFAULTS } from "./presets";
import { validateGlidePathInput } from "./validation";
import type { GlidePathInput } from "./types";

const base = (o: Partial<GlidePathInput> = {}): GlidePathInput => ({
  ...DEFAULTS,
  ...o,
});

describe("validateGlidePathInput — minSpending", () => {
  it("accepts the defaults", () => {
    expect(validateGlidePathInput(base())).toEqual({});
  });

  it("accepts a floor at or below the target income", () => {
    expect(validateGlidePathInput(base({ minSpending: 60000 }))).toEqual({});
  });

  it("flags a floor above the target income (a floor above target is nonsensical)", () => {
    const errors = validateGlidePathInput(
      base({ targetIncome: 60000, minSpending: 70000 }),
    );
    expect(errors.minSpending).toMatch(/can't exceed your target income/i);
  });

  it("flags a negative floor via the range constraint", () => {
    const errors = validateGlidePathInput(base({ minSpending: -1 }));
    expect(errors.minSpending).toBeTruthy();
  });
});
