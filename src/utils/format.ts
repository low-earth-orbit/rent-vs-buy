const cadFull = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const cadCompact = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const cadDecimal = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat("en-CA", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCAD(value: number): string {
  return cadFull.format(value);
}

export function formatCADCompact(value: number): string {
  return cadCompact.format(value);
}

export function formatCADDecimal(value: number): string {
  return cadDecimal.format(value);
}

export function formatPercentage(value: number): string {
  return percentageFormatter.format(value);
}
