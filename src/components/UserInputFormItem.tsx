import { NumberInput } from "@mantine/core";
import type { ReactNode } from "react";
import FieldLabel from "./FieldLabel";
import type { FieldValue } from "../types";

interface UserInputFormItemProps {
  id: string;
  label: ReactNode;
  helperText?: string;
  min?: number;
  max?: number;
  step?: number;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  thousandSeparator?: boolean;
  disabled?: boolean;
  allowNegative?: boolean;
  error?: string;
  prefix?: string;
  suffix?: string;
}

export default function UserInputFormItem({
  id,
  label,
  helperText,
  min,
  max,
  step,
  value,
  onChange,
  thousandSeparator,
  disabled,
  allowNegative,
  error,
  ...rest
}: UserInputFormItemProps) {
  return (
    <NumberInput
      id={id}
      label={<FieldLabel label={label} helperText={helperText} />}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      allowNegative={allowNegative ?? false}
      thousandSeparator={thousandSeparator ? "," : undefined}
      error={error}
      clampBehavior="none"
      styles={{ label: { display: "block" } }}
      {...rest}
    />
  );
}
