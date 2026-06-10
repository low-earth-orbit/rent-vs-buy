// Parser for Wealthsimple account activity CSV exports.
//
// Supports two formats:
// 1. The real Wealthsimple export with columns
//    `transaction_date,settlement_date,account_id,account_type,activity_type,
//     activity_sub_type,direction,symbol,name,currency,quantity,unit_price,
//     commission,net_cash_amount`, where transaction type is derived from
//    `activity_type` + `activity_sub_type` + `direction`.
// 2. A legacy format with a literal `Type` column (`buy`/`sell`/`dividend`).
//
// ACB semantics:
// - `buy` rows add qty × price to the symbol's cost basis pool and qty to its
//   share count (manual DRIP purchases are plain `buy` rows).
// - `sell` rows reduce the share count AND reduce the cost basis pool pro-rata
//   (CRA rule: pool × remaining_shares / shares_before_sell), so ACB/share is
//   unchanged by a sale but total cost basis decreases proportionally.
// - `dividend` rows do not contribute to ACB (the subsequent DRIP `buy` does).
// - `transfer` rows (SecurityTransfer) add shares with no cost basis; the user
//   supplies the opening lot ACB manually in the UI.

export type AcbTransaction = {
  symbol: string;
  quantity: number;
  price: number;
  type: "buy" | "sell" | "dividend" | "transfer";
  /** ISO currency code from the optional Currency column; "CAD" when absent. */
  currency?: string;
  /** ISO date string from `transaction_date`; "" when the column is absent. */
  date?: string;
  /** Raw `activity_type` (or legacy `Type`) value as it appeared in the CSV. */
  rawActivityType?: string;
};

export type Holding = {
  symbol: string;
  /** Net shares: total bought plus transferred minus total sold. */
  shares: number;
  /** Remaining cost basis pool after pro-rata reductions on sells. */
  costBasis: number;
  /** costBasis / shares, or null when no shares remain (division by zero). */
  acbPerShare: number | null;
  /** Shares transferred in with no purchase history (no cost basis). */
  transferredShares: number;
};

export type ParseResult =
  | { ok: true; transactions: AcbTransaction[] }
  | { ok: false; error: string };

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

/**
 * Derive the transaction type from the Wealthsimple activity columns.
 * Returns null for activity types that don't affect holdings (deposits,
 * interest, fees, etc.).
 */
function mapActivityType(
  activityType: string,
  activitySubType: string,
  direction: string,
): AcbTransaction["type"] | null {
  const type = activityType.trim().toLowerCase();
  if (type === "trade") {
    const sub = activitySubType.trim().toLowerCase();
    const dir = direction.trim().toLowerCase();
    if (sub === "buy" && dir === "long") return "buy";
    if (sub === "sell" && dir === "short") return "sell";
    return null;
  }
  if (type === "dividend") return "dividend";
  if (type === "securitytransfer") return "transfer";
  return null;
}

export function parseWealthsimpleCsv(text: string): ParseResult {
  const lines = text
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { ok: false, error: "No transactions found" };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name: string): number => header.indexOf(name);

  // Symbol / quantity / price columns differ between the two formats.
  const symbolIdx = col("symbol");
  const quantityIdx = col("quantity");
  const priceIdx = col("unit_price") !== -1 ? col("unit_price") : col("price");
  const typeIdx = col("type");
  const activityTypeIdx = col("activity_type");
  const activitySubTypeIdx = col("activity_sub_type");
  const directionIdx = col("direction");
  const currencyIdx = col("currency");
  const dateIdx = col("transaction_date");

  // The legacy `Type` column wins when present; otherwise require the
  // Wealthsimple activity columns.
  const hasLegacyType = typeIdx !== -1;
  const missing: string[] = [];
  if (symbolIdx === -1) missing.push(hasLegacyType ? "Symbol" : "symbol");
  if (quantityIdx === -1) {
    missing.push(hasLegacyType ? "Quantity" : "quantity");
  }
  if (priceIdx === -1) missing.push(hasLegacyType ? "Price" : "unit_price");
  if (!hasLegacyType && activityTypeIdx === -1) {
    missing.push("activity_type (or Type)");
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
    const field = (idx: number): string =>
      idx === -1 ? "" : (fields[idx] ?? "").trim();

    let type: AcbTransaction["type"] | null;
    let rawActivityType: string;
    if (hasLegacyType) {
      rawActivityType = field(typeIdx);
      const legacy = rawActivityType.toLowerCase();
      type =
        legacy === "buy" ||
        legacy === "sell" ||
        legacy === "dividend" ||
        legacy === "transfer"
          ? legacy
          : null;
    } else {
      rawActivityType = field(activityTypeIdx);
      type = mapActivityType(
        rawActivityType,
        field(activitySubTypeIdx),
        field(directionIdx),
      );
    }
    if (type === null) continue; // ignore deposits, interest, fees, etc.

    const symbol = field(symbolIdx);
    if (!symbol) continue;
    const quantity = parseNumber(fields[quantityIdx]);
    const price = parseNumber(fields[priceIdx]);
    const rawCurrency = field(currencyIdx);
    transactions.push({
      symbol,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      price: Number.isFinite(price) ? price : 0,
      type,
      currency: rawCurrency === "" ? "CAD" : rawCurrency.toUpperCase(),
      date: field(dateIdx),
      rawActivityType,
    });
  }

  if (transactions.length === 0) {
    return { ok: false, error: "No transactions found" };
  }

  return { ok: true, transactions };
}

/**
 * True when transactions span more than one currency. A missing `currency`
 * field is treated as "CAD" (the column is absent from some exports).
 */
export function hasMixedCurrencies(transactions: AcbTransaction[]): boolean {
  const currencies = new Set(transactions.map((tx) => tx.currency ?? "CAD"));
  return currencies.size > 1;
}

/**
 * True when any two files have overlapping transaction date ranges —
 * a sign the same transactions may appear in more than one upload.
 * Files with no dated transactions are skipped.
 */
export function detectOverlappingFiles(
  fileTransactions: AcbTransaction[][],
): boolean {
  const ranges: { min: string; max: string }[] = [];
  for (const transactions of fileTransactions) {
    const dates = transactions
      .map((tx) => tx.date ?? "")
      .filter((d) => d !== "");
    if (dates.length === 0) continue;
    ranges.push({
      min: dates.reduce((a, b) => (a < b ? a : b)),
      max: dates.reduce((a, b) => (a > b ? a : b)),
    });
  }
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (ranges[i].min <= ranges[j].max && ranges[j].min <= ranges[i].max) {
        return true;
      }
    }
  }
  return false;
}

/** Aggregate transactions into per-symbol holdings with ACB. */
export function computeHoldings(transactions: AcbTransaction[]): Holding[] {
  const bySymbol = new Map<
    string,
    { shares: number; costBasis: number; transferredShares: number }
  >();
  for (const tx of transactions) {
    if (tx.type === "dividend") continue; // dividends never touch ACB
    const entry = bySymbol.get(tx.symbol) ?? {
      shares: 0,
      costBasis: 0,
      transferredShares: 0,
    };
    if (tx.type === "buy") {
      entry.shares += tx.quantity;
      entry.costBasis += tx.quantity * tx.price;
    } else if (tx.type === "transfer") {
      // Transferred-in shares carry no purchase history: count the shares but
      // leave the cost basis pool unchanged. The user supplies an opening lot
      // ACB in the UI.
      entry.shares += tx.quantity;
      entry.transferredShares += tx.quantity;
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
      ([symbol, { shares, costBasis, transferredShares }]): Holding => ({
        symbol,
        shares,
        costBasis,
        acbPerShare: shares > 0 ? costBasis / shares : null,
        transferredShares,
      }),
    )
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/**
 * Apply a T3 return-of-capital (ROC) reduction to a holding's cost basis.
 * ROC reduces ACB: costBasis -= roc. Pass the ROC amount from box 42 of the T3.
 */
export function applyT3Adjustment(holding: Holding, roc: number): Holding {
  return applyAdjustments(holding, 0, roc);
}

/**
 * Apply UI-layer cost basis adjustments to a holding:
 * - `openingLot`: total cost basis for transferred-in shares (added first)
 * - `roc`: T3 box 42 return of capital (subtracted, clamped at zero)
 */
export function applyAdjustments(
  holding: Holding,
  openingLot: number,
  roc: number,
): Holding {
  const costBasis = Math.max(0, holding.costBasis + openingLot - roc);
  return {
    ...holding,
    costBasis,
    acbPerShare: holding.shares > 0 ? costBasis / holding.shares : null,
  };
}
