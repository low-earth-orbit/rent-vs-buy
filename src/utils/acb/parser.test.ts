import { describe, expect, it } from "vitest";
import {
  applyT3Adjustment,
  computeHoldings,
  hasMixedCurrencies,
  parseWealthsimpleCsv,
  type AcbTransaction,
} from "./parser";

const HEADER = "Date,Symbol,Quantity,Price,Type,Description";

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

describe("parseWealthsimpleCsv", () => {
  it("parses buy, sell, and dividend rows", () => {
    const result = parseWealthsimpleCsv(
      csv(
        "2025-01-02,VEQT,10,40.00,buy,Bought 10 VEQT",
        "2025-02-01,VEQT,,0,dividend,Dividend",
        "2025-02-02,VEQT,1,41.00,buy,DRIP",
        "2025-03-01,VEQT,4,45.00,sell,Sold 4 VEQT",
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transactions).toHaveLength(4);
    expect(result.transactions[0]).toEqual({
      symbol: "VEQT",
      quantity: 10,
      price: 40,
      type: "buy",
      currency: "CAD",
    });
    expect(result.transactions[1].type).toBe("dividend");
    expect(result.transactions[3].type).toBe("sell");
  });

  it("ignores irrelevant transaction types", () => {
    const result = parseWealthsimpleCsv(
      csv(
        "2025-01-01,,0,0,deposit,Deposit",
        "2025-01-02,XEQT,5,30.00,buy,Bought",
        "2025-01-03,,0,0,withdrawal,Withdrawal",
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].symbol).toBe("XEQT");
  });

  it("matches column headers case-insensitively and in any order", () => {
    const result = parseWealthsimpleCsv(
      ["type,price,quantity,symbol", "buy,25.50,2,XGRO"].join("\n"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transactions[0]).toEqual({
      symbol: "XGRO",
      quantity: 2,
      price: 25.5,
      type: "buy",
      currency: "CAD",
    });
  });

  it("parses the Currency column case-insensitively and uppercases values", () => {
    const result = parseWealthsimpleCsv(
      [
        "Date,Symbol,Quantity,Price,Type,currency",
        "2025-01-02,VEQT,10,40.00,buy,cad",
        "2025-01-03,VTI,5,200.00,buy,usd",
        "2025-01-04,XEQT,3,30.00,buy,",
      ].join("\n"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transactions.map((tx) => tx.currency)).toEqual([
      "CAD",
      "USD",
      "CAD", // empty field defaults to CAD
    ]);
  });

  it("defaults currency to CAD when the column is absent", () => {
    const result = parseWealthsimpleCsv(
      csv("2025-01-02,VEQT,10,40.00,buy,Bought"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transactions[0].currency).toBe("CAD");
  });

  it("handles quoted fields containing commas and formatted numbers", () => {
    const result = parseWealthsimpleCsv(
      csv('2025-01-02,VEQT,10,"$1,000.00",buy,"Bought, with comma"'),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transactions[0].price).toBe(1000);
    expect(result.transactions[0].quantity).toBe(10);
  });

  it("reports missing required columns", () => {
    const result = parseWealthsimpleCsv(
      ["Date,Symbol,Type", "2025-01-02,VEQT,buy"].join("\n"),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("Quantity");
    expect(result.error).toContain("Price");
    expect(result.error).not.toContain("Symbol");
  });

  it("returns an error for an empty file", () => {
    const result = parseWealthsimpleCsv("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("No transactions found");
  });

  it("returns an error when there are no relevant transactions", () => {
    const result = parseWealthsimpleCsv(csv("2025-01-01,,0,0,deposit,Cash"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("No transactions found");
  });
});

describe("hasMixedCurrencies", () => {
  const tx = (currency?: string): AcbTransaction => ({
    symbol: "VEQT",
    quantity: 1,
    price: 10,
    type: "buy",
    ...(currency !== undefined ? { currency } : {}),
  });

  it("returns false for an empty list", () => {
    expect(hasMixedCurrencies([])).toBe(false);
  });

  it("returns false when all transactions share one currency", () => {
    expect(hasMixedCurrencies([tx("CAD"), tx("CAD")])).toBe(false);
    expect(hasMixedCurrencies([tx("USD"), tx("USD")])).toBe(false);
  });

  it("returns true when currencies differ", () => {
    expect(hasMixedCurrencies([tx("CAD"), tx("USD")])).toBe(true);
  });

  it("treats a missing currency field as CAD", () => {
    expect(hasMixedCurrencies([tx(), tx("CAD")])).toBe(false);
    expect(hasMixedCurrencies([tx(), tx("USD")])).toBe(true);
  });
});

describe("computeHoldings", () => {
  const tx = (
    symbol: string,
    quantity: number,
    price: number,
    type: AcbTransaction["type"],
  ): AcbTransaction => ({ symbol, quantity, price, type });

  it("accumulates buys into the cost basis pool", () => {
    const holdings = computeHoldings([
      tx("VEQT", 10, 40, "buy"),
      tx("VEQT", 10, 50, "buy"),
    ]);
    expect(holdings).toEqual([
      { symbol: "VEQT", shares: 20, costBasis: 900, acbPerShare: 45 },
    ]);
  });

  it("sells reduce shares and cost basis pool pro-rata (CRA rule)", () => {
    // Buy 10 @ $40 → pool = $400, ACB/share = $40
    // Sell 4 → remaining 6 shares; pool = 400 × (6/10) = $240, ACB/share still $40
    const holdings = computeHoldings([
      tx("VEQT", 10, 40, "buy"),
      tx("VEQT", 4, 60, "sell"),
    ]);
    expect(holdings).toEqual([
      { symbol: "VEQT", shares: 6, costBasis: 240, acbPerShare: 40 },
    ]);
  });

  it("dividend rows do not contribute to ACB", () => {
    const holdings = computeHoldings([
      tx("VEQT", 10, 40, "buy"),
      tx("VEQT", 5, 40, "dividend"),
      tx("VEQT", 1, 41, "buy"), // the DRIP buy that follows
    ]);
    expect(holdings).toEqual([
      { symbol: "VEQT", shares: 11, costBasis: 441, acbPerShare: 441 / 11 },
    ]);
  });

  it("returns null ACB when all shares are sold (division by zero)", () => {
    // Pool fully zeroed out pro-rata when all shares sold
    const holdings = computeHoldings([
      tx("VEQT", 10, 40, "buy"),
      tx("VEQT", 10, 60, "sell"),
    ]);
    expect(holdings).toEqual([
      { symbol: "VEQT", shares: 0, costBasis: 0, acbPerShare: null },
    ]);
  });

  it("groups by symbol and sorts alphabetically", () => {
    const holdings = computeHoldings([
      tx("XEQT", 5, 30, "buy"),
      tx("VEQT", 10, 40, "buy"),
    ]);
    expect(holdings.map((h) => h.symbol)).toEqual(["VEQT", "XEQT"]);
  });
});

describe("applyT3Adjustment", () => {
  it("subtracts ROC from cost basis and recalculates ACB", () => {
    // 10 shares @ $40 = $400 pool. ROC of $100 → pool = $300, ACB/share = $30.
    const holding = computeHoldings([
      { symbol: "VEQT", quantity: 10, price: 40, type: "buy" },
    ])[0];
    const adjusted = applyT3Adjustment(holding, 100);
    expect(adjusted.costBasis).toBe(300);
    expect(adjusted.acbPerShare).toBe(30);
  });

  it("clamps cost basis to zero (ROC cannot create negative ACB)", () => {
    const holding = computeHoldings([
      { symbol: "VEQT", quantity: 10, price: 40, type: "buy" },
    ])[0];
    const adjusted = applyT3Adjustment(holding, 9999);
    expect(adjusted.costBasis).toBe(0);
    expect(adjusted.acbPerShare).toBe(0);
  });

  it("keeps ACB null when no shares remain", () => {
    const adjusted = applyT3Adjustment(
      { symbol: "VEQT", shares: 0, costBasis: 0, acbPerShare: null },
      100,
    );
    expect(adjusted.costBasis).toBe(0);
    expect(adjusted.acbPerShare).toBeNull();
  });
});
