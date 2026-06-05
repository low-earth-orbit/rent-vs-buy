import { describe, expect, it } from "vitest";
import { buildGlidePathChartData } from "./GlidePathChart";

describe("buildGlidePathChartData", () => {
  it("extends the final holding period to the planning-age boundary", () => {
    const data = buildGlidePathChartData(
      { startAge: 35, planningAge: 95 },
      {
        equityByYear: Array.from({ length: 60 }, () => 0.6),
        params: { accumYears: 30 },
      },
    );

    expect(data).toHaveLength(61);
    expect(data.at(-2)).toMatchObject({ age: 94, equity: 60 });
    expect(data.at(-1)).toEqual({ age: 95, equity: 60, phase: "retire" });
  });
});
