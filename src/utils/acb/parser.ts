// Parser for Wealthsimple non-registered account activity CSV exports.
//
// Relevant columns: Symbol, Quantity, Price, Type.
// - `buy` rows add qty × price to the symbol's cost basis pool and qty to its
//   share count (manual DRIP purchases are plain `buy` rows).
// - `sell` rows reduce the share count AND reduce the cost basis pool pro-rata
//   (CRA rule: pool × remaining_shares / shares_before_sell), so ACB/share is
//   unchanged by a sale but total cost basis decreases proportionally.
// - `dividend` rows do not contribute to ACB (the subsequent DRIP `buy` does).

export type AcbTransaction = {
  symbol: string;
  quantity: number;
  price: number;
  type: "buy" | "sell" | "dividend";
};

export type Holding = {
  symbol: string;
  /** Net shares: total bought minus total sold. */
  shares: number;
  /** Remaining cost basis pool after pro-rata reductions on sells. */
  costBasis: number;
  /** costBasis / shares, or null when no shares remain (division by zero). */
  acbPerShare: number | null;
};

export type ParseResult =
  | { ok: true; transactions: AcbTransaction[] }
  | { ok: false; error: string };

const REQUIRED_COLUMNS = ["Symbol", "Quantity", "Price", "Type"] as const;

/** Split one CSV line into fields, honouring double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/** Parse a numeric CSV field, tolerating `$` and thousands separators. */
function parseNumber(field: string | undefined): number {
  const cleaned = (field ?? "").trim().replace(/[$,]/g, "");
  return cleaned === "" ? 0 : Number(cleaned);
}

export function parseWealthsimpleCsv(text: string): ParseResult {
  const lines = text
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { ok: false, error: "No transactions found" };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const columnIndex: Partial<
    Record<(typeof REQUIRED_COLUMNS)[number], number>
  > = {};
  const missing: string[] = [];
  for (const column of REQUIRED_COLUMNS) {
    const idx = header.indexOf(column.toLowerCase());
    if (idx === -1) {
      missing.push(column);
    } else {
      columnIndex[column] = idx;
    }
  }
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
    };
  }

  const transactions: AcbTransaction[] = [];
  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    const rawType = (fields[columnIndex.Type!] ?? "").trim().toLowerCase();
    if (rawType !== "buy" && rawType !== "sell" && rawType !== "dividend") {
      continue; // ignore deposits, withdrawals, fees, etc.
    }
    const symbol = (fields[columnIndex.Symbol!] ?? "").trim();
    if (!symbol) continue;
    const quantity = parseNumber(fields[columnIndex.Quantity!]);
    const price = parseNumber(fields[columnIndex.Price!]);
    transactions.push({
      symbol,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      price: Number.isFinite(price) ? price : 0,
      type: rawType,
    });
  }

  if (transactions.length === 0) {
    return { ok: false, error: "No transactions found" };
  }

  return { ok: true, transactions };
}

/** Aggregate transactions into per-symbol holdings with ACB. */
export function computeHoldings(transactions: AcbTransaction[]): Holding[] {
  const bySymbol = new Map<string, { shares: number; costBasis: number }>();
  for (const tx of transactions) {
    if (tx.type === "dividend") continue; // dividends never touch ACB
    const entry = bySymbol.get(tx.symbol) ?? { shares: 0, costBasis: 0 };
    if (tx.type === "buy") {
      entry.shares += tx.quantity;
      entry.costBasis += tx.quantity * tx.price;
    } else {
      // CRA rule: sell reduces pool pro-rata so ACB/share is unchanged.
      // remaining_pool = pool × (shares_before - sold) / shares_before
      const sharesAfter = entry.shares - tx.quantity;
      entry.costBasis =
        entry.shares > 0 ? entry.costBasis * (sharesAfter / entry.shares) : 0;
      entry.shares = sharesAfter;
    }
    bySymbol.set(tx.symbol, entry);
  }

  return [...bySymbol.entries()]
    .map(
      ([symbol, { shares, costBasis }]): Holding => ({
        symbol,
        shares,
        costBasis,
        acbPerShare: shares > 0 ? costBasis / shares : null,
      }),
    )
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/** Apply a T3 reinvested-distribution adjustment to a holding's cost basis. */
export function applyT3Adjustment(holding: Holding, t3: number): Holding {
  const costBasis = holding.costBasis + t3;
  return {
    ...holding,
    costBasis,
    acbPerShare: holding.shares > 0 ? costBasis / holding.shares : null,
  };
}
