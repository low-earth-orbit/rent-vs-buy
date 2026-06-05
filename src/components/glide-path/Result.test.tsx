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
  it("prefers the constant allocation when CE income is within 5%", () => {
    renderResult(makeResult());
    expect(screen.getByText(/Recommended allocation/i)).toBeInTheDocument();
    expect(
      screen.getByText(/The constant allocation is preferred/i),
    ).toBeInTheDocument();
  });

  it("reports comparable outcomes for both allocation options", () => {
    renderResult(
      makeResult({
        ceIncome: 55000,
        flatCeIncome: 47000,
        depletion: 0.12,
        flatDepletion: 0.24,
        drawdownDepletion: 0.08,
        flatDrawdownDepletion: 0.18,
      }),
    );
    expect(screen.getAllByText(/Optimized glide path/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/Constant 60% equity/i)).not.toHaveLength(0);
    expect(screen.getByText("$55,000/yr")).toBeInTheDocument();
    expect(screen.getByText("$47,000/yr")).toBeInTheDocument();
    expect(screen.getByText("8.0%")).toBeInTheDocument();
    expect(screen.getByText("18.0%")).toBeInTheDocument();
    expect(screen.getByText("12.0%")).toBeInTheDocument();
    expect(screen.getByText("24.0%")).toBeInTheDocument();
  });

  it("prefers the constant when drawdown depletion is within five points", () => {
    renderResult(
      makeResult({
        ceIncome: 60000,
        flatCeIncome: 50000,
        drawdownDepletion: 0.05,
        flatDrawdownDepletion: 0.1,
        depletion: 0.1,
        flatDepletion: 0.25,
      }),
    );
    expect(screen.getByText(/Recommended allocation/i)).toBeInTheDocument();
    expect(
      screen.getByText(/The constant allocation is preferred/i),
    ).toBeInTheDocument();
  });

  it("prefers the constant when full-path shortfall is within five points", () => {
    renderResult(
      makeResult({
        ceIncome: 60000,
        flatCeIncome: 50000,
        drawdownDepletion: 0.05,
        flatDrawdownDepletion: 0.2,
        depletion: 0.1,
        flatDepletion: 0.15,
      }),
    );
    expect(screen.getByText(/Recommended allocation/i)).toBeInTheDocument();
    expect(
      screen.getByText(/The constant allocation is preferred/i),
    ).toBeInTheDocument();
  });

  it("prefers the constant when it wins all comparable outcomes", () => {
    renderResult(
      makeResult({
        ceIncome: 50000,
        flatCeIncome: 51000,
        drawdownDepletion: 0.08,
        flatDrawdownDepletion: 0.07,
        depletion: 0.12,
        flatDepletion: 0.1,
      }),
    );
    expect(screen.getByText(/Recommended allocation/i)).toBeInTheDocument();
    expect(
      screen.getByText(/The constant allocation is preferred/i),
    ).toBeInTheDocument();
  });

  it("prefers the glide path when the constant trails every threshold", () => {
    renderResult(
      makeResult({
        ceIncome: 60000,
        flatCeIncome: 50000,
        drawdownDepletion: 0.05,
        flatDrawdownDepletion: 0.11,
        depletion: 0.1,
        flatDepletion: 0.16,
      }),
    );
    expect(screen.getByText(/Recommended allocation/i)).toBeInTheDocument();
    expect(screen.getByText(/trails it by more than/i)).toBeInTheDocument();
  });

  it("uses inline warning icons instead of planner-style alerts", () => {
    const { container } = renderResult(
      makeResult({
        ceIncome: 95,
        flatCeIncome: 50000,
        depletion: 0.3,
        drawdownDepletion: 0.25,
        flatDepletion: 0.08,
        flatDrawdownDepletion: 0.04,
      }),
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      container.querySelectorAll(".tabler-icon-alert-triangle"),
    ).toHaveLength(3);
    expect(screen.getByText(/Tail-dominated/i)).toBeInTheDocument();
  });

  it("prefers the glide path when the constant CE score is tail-dominated", () => {
    renderResult(
      makeResult({ ceIncome: 93608, flatCeIncome: 444, depletion: 0.05 }),
    );
    expect(
      screen.getByText(/risk-adjusted \(CE\) income is unreliable/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tail-dominated/i)).toBeInTheDocument();
  });

  it("explains preferring the glide path when the constant is tail-dominated", () => {
    renderResult(
      makeResult({ ceIncome: 93608, flatCeIncome: 444, depletion: 0.05 }),
    );
    expect(
      screen.getByText(/risk-adjusted \(CE\) income is unreliable/i),
    ).toBeInTheDocument();
  });

  it("renders an error state when the worker fails", () => {
    renderResult(null, { error: true });
    expect(screen.getByText(/Couldn't compute/i)).toBeInTheDocument();
  });

  it("shows the empty state before generating", () => {
    renderResult(null);
    expect(screen.getByText(/Ready to optimize/i)).toBeInTheDocument();
  });

  it("shows the loading state while computing", () => {
    renderResult(null, { computing: true });
    expect(
      screen.getByText(/Optimizing your allocation paths/i),
    ).toBeInTheDocument();
  });

  it("shows the incomplete-inputs alert when there are errors", () => {
    renderResult(makeResult(), { hasErrors: true });
    expect(screen.getByText(/Incomplete inputs/i)).toBeInTheDocument();
  });
});
