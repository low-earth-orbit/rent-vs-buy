import { useState } from "react";
import {
  Group,
  Input,
  NumberInput,
  SegmentedControl,
  Stack,
} from "@mantine/core";
import FieldLabel from "./FieldLabel";
import type { FieldValue } from "../types";

interface CurrencyPercentItemProps {
  id: string;
  label: string;
  helperText: string;
  unitAriaLabel: string;
  /** Stored value, as a percentage of today's home price. */
  rate: FieldValue;
  homePrice: number;
  /** Called with the new value, always normalized back to a percentage. */
  onChange: (rate: FieldValue) => void;
  error?: string;
  defaultUnit?: "$" | "%";
}

/**
 * A recurring-cost input that toggles between a dollar amount (per year) and a
 * percentage of today's home price. Used for property tax and maintenance,
 * which share identical $/% conversion logic.
 */
export default function CurrencyPercentItem({
  id,
  label,
  helperText,
  unitAriaLabel,
  rate,
  homePrice,
  onChange,
  error,
  defaultUnit = "$",
}: CurrencyPercentItemProps) {
  const [unit, setUnit] = useState<string>(defaultUnit);

  const rateIsEmpty = rate === "" || rate == null;
  const displayValue =
    unit === "$"
      ? rateIsEmpty
        ? ""
        : homePrice > 0
          ? Math.round((+rate / 100) * homePrice)
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
    if (!homePrice || homePrice <= 0) return;
    // 4 dp avoids floating-point noise like 0.8500000000000001 while
    // preserving $1/yr precision at a $1M home.
    const pct = (+next / homePrice) * 100;
    onChange(Math.round(pct * 10000) / 10000);
  };

  return (
    <Stack gap={4}>
      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
        <Input.Label htmlFor={id}>
          <FieldLabel label={label} helperText={helperText} />
        </Input.Label>
        <SegmentedControl
          size="xs"
          value={unit}
          onChange={setUnit}
          aria-label={unitAriaLabel}
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
        suffix={unit === "$" ? " /yr" : "%"}
        thousandSeparator={unit === "$" ? "," : undefined}
        min={0}
        step={unit === "$" ? 100 : 0.1}
        allowNegative={false}
        clampBehavior="none"
      />
    </Stack>
  );
}
