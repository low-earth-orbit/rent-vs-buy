import { describe, expect, it, vi } from "vitest";
import { renderWithMantine, screen } from "@/test-utils";
import UserInputFormItem from "./UserInputFormItem";

describe("UserInputFormItem", () => {
  it("only reserves space for additional text when it is present", () => {
    const { container, rerender } = renderWithMantine(
      <UserInputFormItem
        id="amount"
        label="Amount"
        value={100}
        onChange={vi.fn()}
      />,
    );

    expect(container.querySelector("[aria-live='polite']")).toBeNull();

    rerender(
      <UserInputFormItem
        id="amount"
        label="Amount"
        additionalText="Calculated detail"
        value={100}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Calculated detail")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });
});
