import { describe, expect, it } from "vitest";
import { DEFAULTS } from "./presets";
import { validateGlidePathInput } from "./validation";
import type { GlidePathInput } from "./types";

const base = (o: Partial<GlidePathInput> = {}): GlidePathInput => ({
  ...DEFAULTS,
  ...o,
});

describe("validateGlidePathInput", () => {
  it("accepts the defaults", () => {
    expect(validateGlidePathInput(base())).toEqual({});
  });

  it("flags a retirement age that is not after the start age", () => {
    const errors = validateGlidePathInput(base({ retirementAge: 35 }));
    expect(errors.retirementAge).toMatch(/must be after your start age/i);
  });

  it("flags a planning age that is not after retirement", () => {
    const errors = validateGlidePathInput(base({ planningAge: 65 }));
    expect(errors.planningAge).toMatch(/must be after retirement/i);
  });

  it("flags an out-of-range field", () => {
    const errors = validateGlidePathInput(base({ guaranteedIncome: -1 }));
    expect(errors.guaranteedIncome).toBeTruthy();
  });
});
