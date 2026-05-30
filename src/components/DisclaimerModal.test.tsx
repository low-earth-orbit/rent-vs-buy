import { describe, it, expect, vi } from "vitest";
import { renderWithMantine, screen } from "../test-utils";
import userEvent from "@testing-library/user-event";
import DisclaimerModal from "./DisclaimerModal";

describe("DisclaimerModal", () => {
  it("shows the disclaimer body when opened", () => {
    renderWithMantine(<DisclaimerModal opened onAccept={() => {}} />);

    expect(
      screen.getByText(/educational tool, not financial advice/i),
    ).toBeInTheDocument();
  });

  it("calls onAccept when the acknowledge button is clicked", async () => {
    const onAccept = vi.fn();
    renderWithMantine(<DisclaimerModal opened onAccept={onAccept} />);

    await userEvent.click(screen.getByRole("button", { name: "I understand" }));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("renders nothing when closed", () => {
    renderWithMantine(<DisclaimerModal opened={false} onAccept={() => {}} />);
    expect(screen.queryByText(/not financial advice/i)).not.toBeInTheDocument();
  });
});
