import { describe, expect, it } from "vitest";
import { renderWithMantine, screen } from "@/test-utils";
import Result from "./Result";
import { DEFAULTS } from "@/utils/glide-path/presets";
import type { GlidePathResult } from "@/utils/glide-path/types";

/** A coherent default result; override fields (and individual params) per test. */
type ResultOverrides = Partial<Omit<GlidePathResult, "params">> & {
  params?: Partial<GlidePathResult["params"]>;
};
function makeResult(o: ResultOverrides = {}): GlidePathResult {
  const params = {
    accumYears: 30,
    retireYears: 30,
    guaranteed: 20000,
    maxLeverage: 1,
    borrowCost: 2,
    bequestWeight: 0,
    gamma: 3,
    interval: 5,
    ...o.params,
  };
  return {
    schedule: [
      {
        step: 0,
        yearStart: 0,
        yearEnd: 29,
        ageStart: 35,
        phase: "accum",
        equityPct: 80,
      },
      {
        step: 1,
        yearStart: 30,
        yearEnd: 59,
        ageStart: 65,
        phase: "retire",
        equityPct: 50,
      },
    ],
    equityByYear: Array.from({ length: 60 }, (_, i) => (i < 30 ? 0.8 : 0.5)),
    accumDir: "Falling",
    retireDir: "Rising",
    tentPct: 50,
    tentAge: 66,
    ceIncome: 50000,
    flatEquityPct: 60,
    flatCeIncome: 49000,
    depletion: 0.05,
    drawdownDepletion: 0.05,
    expectedRetirementBalance: 1200000,
    flatDepletion: 0.06,
    flatDrawdownDepletion: 0.04,
    incomeCv: 0.2,
    medianBequest: 100000,
    medianEstateYears: 2,
    bequestTargetReached: null,
    ...o,
    params,
  };
}

function renderResult(result: GlidePathResult | null, extra = {}) {
  return renderWithMantine(
    <Result
      input={{ ...DEFAULTS }}
      result={result}
      computing={false}
      hasErrors={false}
      {...extra}
    />,
  );
}

describe("glide-path Result", () => {
  it("leads with the constant allocation when the glide edge is small (<5%)", () => {
    // 50000 vs 49000 ≈ 2% edge → recommend the constant weight.
    renderResult(makeResult());
    expect(screen.getByText(/hold a constant 60% equity/i)).toBeInTheDocument();
    expect(screen.getByText(/Simplest/i)).toBeInTheDocument();
  });

  it("leads with the glide path when its edge is meaningful (>=5%)", () => {
    // 55000 vs 49000 ≈ 12% edge → recommend the glide path.
    renderResult(makeResult({ ceIncome: 55000, flatCeIncome: 49000 }));
    expect(screen.getByText(/Recommended glide path/i)).toBeInTheDocument();
    expect(screen.getByText(/vs constant/i)).toBeInTheDocument();
  });

  it("warns when drawdown depletion is high", () => {
    renderResult(
      makeResult({
        depletion: 0.3,
        drawdownDepletion: 0.3,
      }),
    );
    expect(screen.getByText(/High chance of running out/i)).toBeInTheDocument();
    expect(
      screen.getByText(/retiring later, lowering your target/i),
    ).toBeInTheDocument();
  });

  it("does not warn when depletion is low", () => {
    renderResult(makeResult({ depletion: 0.05 }));
    // The warning title says "running out of money"; the metric label ("Chance of
    // running out") is always present, so match the warning-specific phrasing.
    expect(screen.queryByText(/running out of money/i)).toBeNull();
  });

  it("flags a failing plan and suppresses the income figure when depletion is high and CE is degenerate", () => {
    // Both CEs collapsed to the floor artifact, and depletion clears the warning threshold.
    renderResult(
      makeResult({
        ceIncome: 95,
        flatCeIncome: 99,
        depletion: 0.3,
        drawdownDepletion: 0.3,
        flatDrawdownDepletion: 0.3,
      }),
    );
    expect(
      screen.getByText(/No allocation reliably funds this plan/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/running out of money/i)).toBeInTheDocument();
    expect(screen.getByText(/Tail-dominated/i)).toBeInTheDocument();
  });

  it("does not show a running-out warning when depletion is low even if CE is degenerate", () => {
    renderResult(
      makeResult({
        ceIncome: 95,
        flatCeIncome: 99,
        depletion: 0.02,
        drawdownDepletion: 0.02,
      }),
    );
    expect(
      screen.queryByText(/No allocation reliably funds this plan/i),
    ).toBeNull();
    expect(screen.queryByText(/running out of money/i)).toBeNull();
    expect(screen.getByText(/Low ruin risk/i)).toBeInTheDocument();
    expect(
      screen.getByText(/certainty-equivalent income score/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tail-dominated/i)).toBeInTheDocument();
  });

  it("separates drawdown depletion from full-path accumulation shortfall", () => {
    renderResult(
      makeResult({
        depletion: 0.22,
        drawdownDepletion: 0.03,
        expectedRetirementBalance: 1960000,
      }),
    );
    expect(screen.queryByText(/running out of money/i)).toBeNull();
    expect(
      screen.getByText(/Pre-retirement market risk matters/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Drawdown depletion/i)).toBeInTheDocument();
    expect(screen.getByText(/Full-path shortfall/i)).toBeInTheDocument();
  });

  it("does not recommend the constant comparator when it has worse drawdown risk", () => {
    renderResult(
      makeResult({
        ceIncome: 30000,
        flatCeIncome: 50000,
        depletion: 0.2,
        drawdownDepletion: 0.03,
        flatDrawdownDepletion: 0.16,
      }),
    );
    expect(screen.getByText(/Recommended glide path/i)).toBeInTheDocument();
    expect(screen.getByText(/Lower drawdown risk/i)).toBeInTheDocument();
    expect(screen.queryByText(/hold a constant 60% equity/i)).toBeNull();
  });

  it("does not recommend the riskier constant even when BOTH plans fail the drawdown bar", () => {
    // Reproduces the long pre-pension bridge case: the glide's CE is tail-dominated
    // (degenerate) and the constant's CE looks higher, but the constant depletes far more
    // often. Both clear the failure threshold; the recommendation must still defer to the
    // safer glide rather than steering to the fragile constant.
    renderResult(
      makeResult({
        ceIncome: 2900, // degenerate (< 5% of the 60k target)
        flatCeIncome: 5000, // above the degenerate floor, but tail-dominated
        depletion: 0.24,
        drawdownDepletion: 0.12,
        flatDepletion: 0.47,
        flatDrawdownDepletion: 0.38,
      }),
    );
    expect(screen.getByText(/Recommended glide path/i)).toBeInTheDocument();
    expect(screen.getByText(/Lower drawdown risk/i)).toBeInTheDocument();
    expect(screen.queryByText(/hold a constant 60% equity/i)).toBeNull();
    expect(screen.queryByText(/More robust/i)).toBeNull();
  });

  it("recommends the glide path without a bogus % when the best constant is degenerate", () => {
    // Glide funds the plan ($93k) but the best constant collapsed ($444) → no 20,982% ratio.
    renderResult(
      makeResult({ ceIncome: 93608, flatCeIncome: 444, depletion: 0.05 }),
    );
    expect(screen.getByText(/Recommended glide path/i)).toBeInTheDocument();
    expect(screen.getByText(/Materially better/i)).toBeInTheDocument();
    expect(
      screen.getByText(/tail-dominated certainty-equivalent income score/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/vs constant/i)).toBeNull();
    expect(screen.queryByText(/20982/)).toBeNull();
  });

  it("shows the empty state before generating", () => {
    renderResult(null);
    expect(screen.getByText(/Ready to optimize/i)).toBeInTheDocument();
  });

  it("shows the loading state while computing", () => {
    renderResult(null, { computing: true });
    expect(screen.getByText(/Optimizing your glide path/i)).toBeInTheDocument();
  });

  it("shows the incomplete-inputs alert when there are errors", () => {
    renderResult(makeResult(), { hasErrors: true });
    expect(screen.getByText(/Incomplete inputs/i)).toBeInTheDocument();
  });
});
