import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithMantine, screen, within } from "@/test-utils";
import HoldingsTable from "./HoldingsTable";
import type { Holding } from "@/utils/acb/parser";

const HOLDINGS: Holding[] = [
  { symbol: "VEQT", shares: 10, costBasis: 400, acbPerShare: 40 },
  { symbol: "XEQT", shares: 0, costBasis: 0, acbPerShare: null },
];

describe("HoldingsTable", () => {
  it("renders one row per holding with shares, ACB, and cost basis", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Adjustments={{}}
        onT3Change={() => {}}
      />,
    );

    const veqtRow = screen.getByText("VEQT").closest("tr")!;
    expect(within(veqtRow).getByText("10")).toBeInTheDocument();
    expect(within(veqtRow).getByText("$40.00")).toBeInTheDocument();
    expect(within(veqtRow).getByText("$400")).toBeInTheDocument();
  });

  it("shows an em dash for ACB when all shares are sold", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Adjustments={{}}
        onT3Change={() => {}}
      />,
    );

    const xeqtRow = screen.getByText("XEQT").closest("tr")!;
    expect(within(xeqtRow).getByText("—")).toBeInTheDocument();
  });

  it("applies a T3 adjustment to cost basis and ACB per share", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Adjustments={{ VEQT: 100 }}
        onT3Change={() => {}}
      />,
    );

    // ROC of $100 reduces pool: $400 - $100 = $300, ACB/share = $30
    const veqtRow = screen.getByText("VEQT").closest("tr")!;
    expect(within(veqtRow).getByText("$300")).toBeInTheDocument();
    expect(within(veqtRow).getByText("$30.00")).toBeInTheDocument();
  });

  it("calls onT3Change with the symbol when a T3 amount is entered", async () => {
    const user = userEvent.setup();
    const onT3Change = vi.fn();
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Adjustments={{}}
        onT3Change={onT3Change}
      />,
    );

    const input = screen.getByLabelText("T3 ROC (box 42) for VEQT");
    await user.type(input, "25");
    expect(onT3Change).toHaveBeenLastCalledWith("VEQT", 25);
  });
});
