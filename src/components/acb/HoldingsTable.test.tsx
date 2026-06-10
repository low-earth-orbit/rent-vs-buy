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
        t3Slips={{}}
        onEditT3={noop}
        openingLots={{}}
        onOpeningLotChange={noop}
      />,
    );

    const veqtRow = screen.getByText("VEQT").closest("tr")!;
    expect(within(veqtRow).getByText("10")).toBeInTheDocument();
    expect(within(veqtRow).getByText("$40.00")).toBeInTheDocument();
    expect(within(veqtRow).getByText("$400.00")).toBeInTheDocument();
  });

  it("shows an em dash for ACB when all shares are sold", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Slips={{}}
        onEditT3={noop}
        openingLots={{}}
        onOpeningLotChange={noop}
      />,
    );

    const xeqtRow = screen.getByText("XEQT").closest("tr")!;
    expect(within(xeqtRow).getByText("—")).toBeInTheDocument();
  });

  it("applies the net T3 adjustment to cost basis and ACB per share", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Slips={{ VEQT: [{ year: 2024, box21: 0, box42: 100 }] }}
        onEditT3={noop}
        openingLots={{}}
        onOpeningLotChange={noop}
      />,
    );

    // ROC of $100 reduces pool: $400 - $100 = $300, ACB/share = $30
    const veqtRow = screen.getByText("VEQT").closest("tr")!;
    expect(within(veqtRow).getByText("$300.00")).toBeInTheDocument();
    expect(within(veqtRow).getByText("$30.00")).toBeInTheDocument();
  });

  it("nets box 21 against box 42 across years", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Slips={{
          VEQT: [
            { year: 2023, box21: 150, box42: 0 },
            { year: 2024, box21: 0, box42: 50 },
          ],
        }}
        onEditT3={noop}
        openingLots={{}}
        onOpeningLotChange={noop}
      />,
    );

    // Net +$100 raises pool: $400 + $100 = $500, ACB/share = $50
    const veqtRow = screen.getByText("VEQT").closest("tr")!;
    expect(within(veqtRow).getByText("$500.00")).toBeInTheDocument();
    expect(within(veqtRow).getByText("$50.00")).toBeInTheDocument();
  });

  it("shows a signed badge next to Edit T3 when the net is non-zero", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Slips={{
          VEQT: [{ year: 2024, box21: 0, box42: 50 }],
          XEQT: [{ year: 2024, box21: 120, box42: 0 }],
        }}
        onEditT3={noop}
        openingLots={{}}
        onOpeningLotChange={noop}
      />,
    );

    const veqtRow = screen.getByText("VEQT").closest("tr")!;
    expect(within(veqtRow).getByText("−$50")).toBeInTheDocument();
    const xeqtRow = screen.getByText("XEQT").closest("tr")!;
    expect(within(xeqtRow).getByText("+$120")).toBeInTheDocument();
  });

  it("shows no badge when there are no T3 entries or the net is zero", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Slips={{ VEQT: [{ year: 2024, box21: 25, box42: 25 }] }}
        onEditT3={noop}
        openingLots={{}}
        onOpeningLotChange={noop}
      />,
    );

    expect(screen.queryByText(/^[+−]\$/)).not.toBeInTheDocument();
  });

  it("calls onEditT3 with the symbol when Edit T3 is clicked", async () => {
    const user = userEvent.setup();
    const onEditT3 = vi.fn();
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Slips={{}}
        onEditT3={onEditT3}
        openingLots={{}}
        onOpeningLotChange={noop}
      />,
    );

    const veqtRow = screen.getByText("VEQT").closest("tr")!;
    await user.click(within(veqtRow).getByRole("button", { name: "Edit T3" }));
    expect(onEditT3).toHaveBeenCalledWith("VEQT");
  });

  it("hides the opening lot column when no holding has transferred shares", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS}
        t3Slips={{}}
        onEditT3={noop}
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
        t3Slips={{}}
        onEditT3={noop}
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

  it("adds the opening lot to the cost basis pool before the T3 net", () => {
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS_WITH_TRANSFER}
        t3Slips={{ XEQT: [{ year: 2024, box21: 0, box42: 50 }] }}
        onEditT3={noop}
        openingLots={{ XEQT: 200 }}
        onOpeningLotChange={noop}
      />,
    );

    // $300 + $200 opening lot - $50 ROC = $450; ACB/share = 450/15 = $30
    const xeqtRow = screen.getByText("XEQT").closest("tr")!;
    expect(within(xeqtRow).getByText("$450.00")).toBeInTheDocument();
    expect(within(xeqtRow).getByText("$30.00")).toBeInTheDocument();
  });

  it("calls onOpeningLotChange with the symbol when an opening lot is entered", async () => {
    const user = userEvent.setup();
    const onOpeningLotChange = vi.fn();
    renderWithMantine(
      <HoldingsTable
        holdings={HOLDINGS_WITH_TRANSFER}
        t3Slips={{}}
        onEditT3={noop}
        openingLots={{}}
        onOpeningLotChange={onOpeningLotChange}
      />,
    );

    const input = screen.getByLabelText("Opening lot ACB for XEQT");
    await user.type(input, "75");
    expect(onOpeningLotChange).toHaveBeenLastCalledWith("XEQT", 75);
  });
});
