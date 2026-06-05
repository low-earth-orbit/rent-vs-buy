import { NumberInput, Text, Stack } from "@mantine/core";
import type { ReactNode } from "react";
import FieldLabel from "./FieldLabel";
import type { FieldValue } from "@/types";

interface UserInputFormItemProps {
  id: string;
  label: ReactNode;
  labelHelperText?: string;
  description?: ReactNode;
  additionalText?: string;
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
  labelHelperText,
  description,
  additionalText,
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
    <Stack gap={4}>
      <NumberInput
        id={id}
        label={<FieldLabel label={label} helperText={labelHelperText} />}
        description={description}
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
      {additionalText && (
        <Text size="xs" c="dimmed" aria-live="polite">
          {additionalText}
        </Text>
      )}
    </Stack>
  );
}
