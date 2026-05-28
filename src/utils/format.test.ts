import { describe, test, expect } from "vitest";
import { formatCAD, formatCADCompact } from "./format";

describe("currency formatting", () => {
  test("formats whole CAD amounts with no decimals", () => {
    expect(formatCAD(1234567)).toBe("$1,234,567");
  });

  test("formats large amounts compactly", () => {
    expect(formatCADCompact(1500000)).toBe("$1.5M");
  });
});
