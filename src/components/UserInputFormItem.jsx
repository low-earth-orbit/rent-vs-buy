import { NumberInput, Text } from "@mantine/core";

export default function UserInputFormItem({
  id,
  label,
  helperText,
  min,
  max,
  step,
  value,
  placeholder,
  onChange,
  prependText,
  appendText,
  thousandSeparator,
  disabled,
}) {
  const placeholderText = placeholder
    ? placeholder
    : `Enter ${label.toLowerCase()}`;

  return (
    <NumberInput
      id={id}
      label={label}
      description={helperText}
      placeholder={placeholderText}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      allowNegative={false}
      hideControls
      thousandSeparator={thousandSeparator ? "," : undefined}
      leftSection={
        prependText ? (
          <Text size="sm" c="dimmed">
            {prependText}
          </Text>
        ) : undefined
      }
      rightSection={
        appendText ? (
          <Text size="sm" c="dimmed" pr="xs" style={{ whiteSpace: "nowrap" }}>
            {appendText}
          </Text>
        ) : undefined
      }
      rightSectionWidth={appendText ? "auto" : undefined}
    />
  );
}
