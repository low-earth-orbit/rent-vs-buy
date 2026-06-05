import { useState } from "react";
import {
  Group,
  Input,
  NumberInput,
  SegmentedControl,
  Stack,
} from "@mantine/core";
import FieldLabel from "./FieldLabel";
import type { FieldValue } from "@/types";

interface CurrencyPercentItemProps {
  id: string;
  label: string;
  helperText: string;
  unitAriaLabel: string;
  /** Stored value, as a percentage of `percentBase`. */
  rate: FieldValue;
  /** The amount the percentage is taken of (e.g. home price, annual income). */
  percentBase: number;
  /** Called with the new value, always normalized back to a percentage. */
  onChange: (rate: FieldValue) => void;
  error?: string;
  defaultUnit?: "$" | "%";
  /** Suffix shown in dollar mode. Defaults to " /yr". */
  dollarSuffix?: string;
  amountStep?: number;
  percentStep?: number;
}

/**
 * An input that toggles between a dollar amount and a percentage of some base
 * amount (`percentBase`), storing the value canonically as a percentage. Used
 * for property tax / maintenance (% of home price) and retirement income
 * (% of annual income), which share identical $/% conversion logic.
 */
export default function CurrencyPercentItem({
  id,
  label,
  helperText,
  unitAriaLabel,
  rate,
  percentBase,
  onChange,
  error,
  defaultUnit = "$",
  dollarSuffix = " /yr",
  amountStep,
  percentStep,
}: CurrencyPercentItemProps) {
  const [unit, setUnit] = useState<string>(defaultUnit);

  const rateIsEmpty = rate === "" || rate == null;
  const displayValue =
    unit === "$"
      ? rateIsEmpty
        ? ""
        : percentBase > 0
          ? Math.round((+rate / 100) * percentBase)
          : 0
      : rate;

  const handleChange = (next: FieldValue) => {
    if (next === "" || next == null) {
      onChange(next);
      return;
    }
    if (unit === "%") {
      onChange(next);
      return;
    }
    if (!percentBase || percentBase <= 0) return;
    // 4 dp avoids floating-point noise like 0.8500000000000001 while
    // preserving $1/yr precision at a $1M base.
    const pct = (+next / percentBase) * 100;
    onChange(Math.round(pct * 10000) / 10000);
  };

  return (
    <Stack gap={0}>
      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
        <Input.Label htmlFor={id}>
          <FieldLabel label={label} helperText={helperText} />
        </Input.Label>
        <SegmentedControl
          size="xs"
          value={unit}
          onChange={setUnit}
          aria-label={unitAriaLabel}
          styles={{
            root: { height: 22, padding: 2, flexShrink: 0 },
            label: { padding: "0 6px", lineHeight: "18px" },
          }}
          data={[
            { label: "$", value: "$" },
            { label: "%", value: "%" },
          ]}
        />
      </Group>
      <NumberInput
        id={id}
        value={displayValue}
        onChange={handleChange}
        error={error}
        prefix={unit === "$" ? "$" : undefined}
        suffix={unit === "$" ? dollarSuffix : "%"}
        thousandSeparator={unit === "$" ? "," : undefined}
        min={0}
        step={unit === "$" ? amountStep || 100 : percentStep || 0.1}
        allowNegative={false}
        clampBehavior="none"
      />
    </Stack>
  );
}
