import { NumberInput } from "@mantine/core";
import FieldLabel from "./FieldLabel";

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
}) {
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
      {...rest}
    />
  );
}
