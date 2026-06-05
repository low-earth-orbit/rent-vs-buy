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

  it("shows a severe drawdown warning at 25%", () => {
    renderResult(
      makeResult({
        depletion: 0.25,
        drawdownDepletion: 0.25,
      }),
    );
    expect(
      screen.getByText(/Retirement spending may not be sustainable/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/saving more, retiring later/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveStyle({
      "--alert-color": "var(--mantine-color-red-light-color)",
    });
  });

  it("shows no risk alert when both rates are below 10%", () => {
    renderResult(makeResult({ depletion: 0.09, drawdownDepletion: 0.09 }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a drawdown warning at the 10% boundary", () => {
    renderResult(makeResult({ depletion: 0.15, drawdownDepletion: 0.1 }));
    expect(
      screen.getByText(/Retirement spending may not be sustainable/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("treats an exact five-point gap as drawdown risk, not accumulation sensitivity", () => {
    renderResult(makeResult({ depletion: 0.15, drawdownDepletion: 0.1 }));
    expect(
      screen.getByText(/Retirement spending may not be sustainable/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/sensitivity to pre-retirement/i),
    ).not.toBeInTheDocument();
  });

  it("shows one accumulation-sensitive warning when drawdown risk is low", () => {
    renderResult(
      makeResult({
        depletion: 0.22,
        drawdownDepletion: 0.03,
        expectedRetirementBalance: 1960000,
      }),
    );
    expect(
      screen.getByText(/Reaching the expected retirement balance matters/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/gap indicates sensitivity to pre-retirement/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveStyle({
      "--alert-color": "var(--mantine-color-yellow-light-color)",
    });
  });

  it("keeps accumulation-sensitive warnings yellow even above 25% full-path shortfall", () => {
    renderResult(makeResult({ depletion: 0.4, drawdownDepletion: 0.03 }));
    expect(
      screen.getByText(/Reaching the expected retirement balance matters/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveStyle({
      "--alert-color": "var(--mantine-color-yellow-light-color)",
    });
  });

  it("shows one combined warning when risk exists before and after retirement", () => {
    renderResult(makeResult({ depletion: 0.22, drawdownDepletion: 0.12 }));
    expect(
      screen.getByText(/Funding risk exists before and after retirement/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/gap indicates sensitivity to pre-retirement/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("does not describe the full-path gap as a causal accumulation failure rate", () => {
    renderResult(makeResult({ depletion: 0.22, drawdownDepletion: 0.03 }));
    expect(screen.queryByText(/because weak accumulation/i)).toBeNull();
    expect(screen.queryByText(/caused by accumulation/i)).toBeNull();
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
    expect(
      screen.getByText(/Retirement spending may not be sustainable/i),
    ).toBeInTheDocument();
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
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/Low ruin risk/i)).toBeInTheDocument();
    expect(
      screen.getByText(/certainty-equivalent income score/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tail-dominated/i)).toBeInTheDocument();
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
