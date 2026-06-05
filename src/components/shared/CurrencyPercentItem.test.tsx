import { describe, expect, it, vi } from "vitest";
import { fireEvent, renderWithMantine, screen } from "@/test-utils";
import CurrencyPercentItem from "./CurrencyPercentItem";

describe("CurrencyPercentItem", () => {
  it("keeps the field label associated with the input when switching units", () => {
    const onChange = vi.fn();

    renderWithMantine(
      <CurrencyPercentItem
        id="annualSavings"
        label="Annual savings"
        helperText="Amount saved each year."
        unitAriaLabel="Annual savings input unit"
        rate={20}
        percentBase={100_000}
        onChange={onChange}
        defaultUnit="%"
      />,
    );

    expect(
      screen.getByLabelText("Annual savings", { selector: "input" }),
    ).toHaveValue("20%");

    fireEvent.click(screen.getByRole("radio", { name: "$" }));

    expect(
      screen.getByLabelText("Annual savings", { selector: "input" }),
    ).toHaveValue("$20,000 /yr");
  });
});
