import { describe, expect, it } from "vitest";
import { renderWithMantine, screen } from "@/test-utils";
import StatusBadge, { type AppStatus } from "./StatusBadge";

describe("StatusBadge", () => {
  it.each<[AppStatus, string]>([
    ["coming-soon", "Coming soon"],
    ["preview", "Preview"],
    ["new", "New"],
    ["updated", "Updated"],
  ])("renders the %s status label", (status, label) => {
    renderWithMantine(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
