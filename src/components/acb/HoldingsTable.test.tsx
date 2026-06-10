import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithMantine, screen, within } from "@/test-utils";
import HoldingsTable from "./HoldingsTable";
import type { Holding } from "@/utils/acb/parser";

const HOLDINGS: Holding[] = [
  {
    symbol: "VEQT",
    shares: 10,
    costBasis: 400,
    acbPerShare: 40,
    transferredShares: 0,
  },
  {
    symbol: "XEQT",
    shares: 0,
    costBasis: 0,
    acbPerShare: null,
    transferredShares: 0,
  },
];

const HOLDINGS_WITH_TRANSFER: Holding[] = [
  {
    symbol: "VEQT",
    shares: 10,
    costBasis: 400,
    acbPerShare: 40,
    transferredShares: 0,
  },
  {
    symbol: "XEQT",
    shares: 15,
    costBasis: 300,
    acbPerShare: 20,
    transferredShares: 5,
  },
];

const noop = () => {};

describe("HoldingsTable", () => {
  it("renders one row per holding with shares, ACB, and cost basis", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Adjustments={{}}
        onT3Change={noop}
        openingLots={{}}
        onOpeningLotChange={noop}
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
        onT3Change={noop}
        openingLots={{}}
        onOpeningLotChange={noop}
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
        onT3Change={noop}
        openingLots={{}}
        onOpeningLotChange={noop}
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
        openingLots={{}}
        onOpeningLotChange={noop}
      />,
    );

    const input = screen.getByLabelText("T3 ROC (box 42) for VEQT");
    await user.type(input, "25");
    expect(onT3Change).toHaveBeenLastCalledWith("VEQT", 25);
  });

  it("hides the opening lot column when no holding has transferred shares", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Adjustments={{}}
        onT3Change={noop}
        openingLots={{}}
        onOpeningLotChange={noop}
      />,
    );

    expect(screen.queryByText("Opening lot ACB ($)")).not.toBeInTheDocument();
  });

  it("flags holdings with transferred shares and shows the opening lot input", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS_WITH_TRANSFER}
        t3Adjustments={{}}
        onT3Change={noop}
        openingLots={{}}
        onOpeningLotChange={noop}
      />,
    );

    expect(screen.getByText("Opening lot ACB ($)")).toBeInTheDocument();
    const xeqtRow = screen.getByText("XEQT").closest("tr")!;
    expect(within(xeqtRow).getByText("5 transferred")).toBeInTheDocument();
    expect(
      within(xeqtRow).getByLabelText("Opening lot ACB for XEQT"),
    ).toBeInTheDocument();
    // VEQT has no transfers: no badge, no input in its opening lot cell.
    const veqtRow = screen.getByText("VEQT").closest("tr")!;
    expect(
      within(veqtRow).queryByLabelText("Opening lot ACB for VEQT"),
    ).not.toBeInTheDocument();
  });

  it("adds the opening lot to the cost basis pool before the T3 ROC deduction", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS_WITH_TRANSFER}
        t3Adjustments={{ XEQT: 50 }}
        onT3Change={noop}
        openingLots={{ XEQT: 200 }}
        onOpeningLotChange={noop}
      />,
    );

    // $300 + $200 opening lot - $50 ROC = $450; ACB/share = 450/15 = $30
    const xeqtRow = screen.getByText("XEQT").closest("tr")!;
    expect(within(xeqtRow).getByText("$450")).toBeInTheDocument();
    expect(within(xeqtRow).getByText("$30.00")).toBeInTheDocument();
  });

  it("calls onOpeningLotChange with the symbol when an opening lot is entered", async () => {
    const user = userEvent.setup();
    const onOpeningLotChange = vi.fn();
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS_WITH_TRANSFER}
        t3Adjustments={{}}
        onT3Change={noop}
        openingLots={{}}
        onOpeningLotChange={onOpeningLotChange}
      />,
    );

    const input = screen.getByLabelText("Opening lot ACB for XEQT");
    await user.type(input, "75");
    expect(onOpeningLotChange).toHaveBeenLastCalledWith("XEQT", 75);
  });
});
