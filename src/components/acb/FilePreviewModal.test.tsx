import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent, renderWithMantine, screen } from "@/test-utils";
import FilePreviewModal from "./FilePreviewModal";
import type { ParsedFile } from "@/utils/acb/parser";

const noop = () => {};

const FILE: ParsedFile = {
  name: "2024.csv",
  transactions: [
    {
      symbol: "VEQT",
      quantity: 10,
      price: 40,
      type: "buy",
      currency: "CAD",
      date: "2024-01-02",
      accountId: "acc1",
      accountType: "non-registered",
    },
    {
      symbol: "XEQT",
      quantity: 4,
      price: 30,
      type: "sell",
      currency: "USD",
      date: "2024-06-01",
    },
  ],
};

describe("FilePreviewModal", () => {
  it("renders nothing when file is null", () => {
    renderWithMantine(
      <FilePreviewModal
        file={null}
        fileIndex={null}
        onUpdateTransaction={noop}
        onDeleteTransaction={noop}
        onClose={noop}
      />,
    );
    expect(screen.queryByText(/Preview —/)).not.toBeInTheDocument();
  });

  it("renders one row per transaction with structural fields as text", () => {
    renderWithMantine(
      <FilePreviewModal
        file={FILE}
        fileIndex={0}
        onUpdateTransaction={noop}
        onDeleteTransaction={noop}
        onClose={noop}
      />,
    );

    expect(screen.getByText("Preview — 2024.csv")).toBeInTheDocument();
    expect(screen.getByText("2024-01-02")).toBeInTheDocument();
    expect(screen.getByText("non-registered · acc1")).toBeInTheDocument();
    expect(screen.getByText("VEQT")).toBeInTheDocument();
    expect(screen.getByText("XEQT")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for row 1")).toHaveValue("10");
    expect(screen.getByLabelText("Price for row 2")).toHaveValue("$30");
    expect(screen.getByText("2 transactions")).toBeInTheDocument();
  });

  it("calls onUpdateTransaction with a type patch when the Select changes", async () => {
    // Mantine's Combobox scrolls the selected option into view; jsdom has no
    // scrollIntoView.
    window.Element.prototype.scrollIntoView = vi.fn();
    const onUpdateTransaction = vi.fn();
    renderWithMantine(
      <FilePreviewModal
        file={FILE}
        fileIndex={3}
        onUpdateTransaction={onUpdateTransaction}
        onDeleteTransaction={noop}
        onClose={noop}
      />,
    );

    // userEvent's pointer sequence does not open Mantine's Combobox in jsdom;
    // a plain click event does.
    fireEvent.click(screen.getByRole("combobox", { name: "Type for row 1" }));
    fireEvent.click(await screen.findByRole("option", { name: "dividend" }));
    expect(onUpdateTransaction).toHaveBeenCalledWith(3, 0, {
      type: "dividend",
    });
  });

  it("calls onUpdateTransaction with a quantity patch on edit", async () => {
    const user = userEvent.setup();
    const onUpdateTransaction = vi.fn();
    renderWithMantine(
      <FilePreviewModal
        file={FILE}
        fileIndex={0}
        onUpdateTransaction={onUpdateTransaction}
        onDeleteTransaction={noop}
        onClose={noop}
      />,
    );

    // Appends to the existing "10" → 105.
    await user.type(screen.getByLabelText("Quantity for row 1"), "5");
    expect(onUpdateTransaction).toHaveBeenLastCalledWith(0, 0, {
      quantity: 105,
    });
  });

  it("calls onUpdateTransaction with a price patch on edit", async () => {
    const user = userEvent.setup();
    const onUpdateTransaction = vi.fn();
    renderWithMantine(
      <FilePreviewModal
        file={FILE}
        fileIndex={0}
        onUpdateTransaction={onUpdateTransaction}
        onDeleteTransaction={noop}
        onClose={noop}
      />,
    );

    // Appends to the existing "$30" → 305.
    await user.type(screen.getByLabelText("Price for row 2"), "5");
    expect(onUpdateTransaction).toHaveBeenLastCalledWith(0, 1, {
      price: 305,
    });
  });

  it("calls onDeleteTransaction with the file and row index", async () => {
    const user = userEvent.setup();
    const onDeleteTransaction = vi.fn();
    renderWithMantine(
      <FilePreviewModal
        file={FILE}
        fileIndex={2}
        onUpdateTransaction={noop}
        onDeleteTransaction={onDeleteTransaction}
        onClose={noop}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete row 2" }));
    expect(onDeleteTransaction).toHaveBeenCalledWith(2, 1);
  });

  it("calls onClose from the Close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithMantine(
      <FilePreviewModal
        file={FILE}
        fileIndex={0}
        onUpdateTransaction={noop}
        onDeleteTransaction={noop}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
