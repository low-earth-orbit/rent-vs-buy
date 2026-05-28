import { describe, test, expect } from "vitest";
import {
  calculateMortgagePrincipal,
  calculateMonthlyMortgagePayment,
} from "./math";

describe("conventional mortgage calculations", () => {
  test("calculates mortgage principal without CMHC premiums", () => {
    expect(calculateMortgagePrincipal(1000000, 20)).toBe(800000);
    expect(calculateMortgagePrincipal(1000000, 100)).toBe(0);
  });

  test("handles zero-interest mortgage payments", () => {
    expect(calculateMonthlyMortgagePayment(300000, 0, 25)).toBe(1000);
  });
});
