import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithMantine, screen } from "@/test-utils";
import FileUpload from "./FileUpload";

const noop = () => {};

describe("FileUpload", () => {
  it("lists each uploaded file with a remove button", () => {
    renderWithMantine(
      <FileUpload
        fileNames={["2024.csv", "2025.csv"]}
        onFilesAdded={noop}
        onRemoveFile={noop}
      />,
    );

    expect(screen.getByText("2024.csv")).toBeInTheDocument();
    expect(screen.getByText("2025.csv")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove 2024.csv" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove 2025.csv" }),
    ).toBeInTheDocument();
  });

  it("shows no file list when nothing is uploaded", () => {
    renderWithMantine(
      <FileUpload fileNames={[]} onFilesAdded={noop} onRemoveFile={noop} />,
    );
    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
  });

  it("calls onRemoveFile with the index of the deleted file", async () => {
    const user = userEvent.setup();
    const onRemoveFile = vi.fn();
    renderWithMantine(
      <FileUpload
        fileNames={["2024.csv", "2025.csv"]}
        onFilesAdded={noop}
        onRemoveFile={onRemoveFile}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove 2025.csv" }));
    expect(onRemoveFile).toHaveBeenCalledWith(1);
  });
});
