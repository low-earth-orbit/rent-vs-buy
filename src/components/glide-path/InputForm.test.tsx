import { describe, expect, it, vi } from "vitest";
import { fireEvent, renderWithMantine, screen } from "@/test-utils";
import { DEFAULTS } from "@/utils/glide-path/presets";
import type { GlidePathInput } from "@/utils/glide-path/types";
import InputForm from "./InputForm";

function renderForm(input: Partial<GlidePathInput> = {}) {
  return renderWithMantine(
    <InputForm
      input={{
        ...DEFAULTS,
        flexibility: 0.5,
        maxEquityPct: 150,
        ...input,
      }}
      errors={{}}
      onChange={vi.fn()}
      onReset={vi.fn()}
      onGenerate={vi.fn()}
      generating={false}
    />,
  );
}

describe("glide-path InputForm guidance", () => {
  it("shows unfamiliar model controls inline", () => {
    renderForm();

    expect(
      screen.getByText(/How well you tolerate market volatility/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /The percentage of the current portfolio drawn each year/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /How much the optimizer discounts later retirement years./i,
      ),
    ).toBeInTheDocument();
  });

  it("keeps optional and advanced detail in helper popovers", async () => {
    renderForm();

    expect(
      screen.getByRole("button", {
        name: /more information about guaranteed income/i,
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Leverage" }));
    fireEvent.click(screen.getByRole("button", { name: "Simulation" }));

    expect(
      await screen.findByRole("button", {
        name: /more information about max equity/i,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: /more information about glide step/i,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: /more information about monte carlo paths/i,
      }),
    ).toBeInTheDocument();
  });

  it("places a custom risk-aversion input in a selected popover", async () => {
    renderForm({ gamma: 4 });

    const custom = screen.getByRole("button", { name: "Custom" });
    expect(custom).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(custom);

    expect(
      await screen.findByRole("textbox", { name: "Custom risk aversion" }),
    ).toHaveValue("4");
  });
});
