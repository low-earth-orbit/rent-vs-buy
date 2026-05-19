import { Group, NumberInput, Slider, Stack, Text, Tooltip } from "@mantine/core";

const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ opacity: 0.45, flexShrink: 0 }}
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
  </svg>
);

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
  allowNegative,
  sliderMin,
  sliderMax,
  sliderStep,
}) {
  const placeholderText = placeholder ?? `Enter ${label.toLowerCase()}`;
  const hasSlider = sliderMin !== undefined && sliderMax !== undefined;
  const numericValue = typeof value === "number" ? value : sliderMin ?? 0;
  const clampedSliderValue = hasSlider
    ? Math.min(sliderMax, Math.max(sliderMin, numericValue))
    : 0;

  const labelNode = helperText ? (
    <Group gap={4} wrap="nowrap" display="inline-flex" style={{ alignItems: "center" }}>
      <span>{label}</span>
      <Tooltip label={helperText} multiline maw={260} withArrow position="top-start">
        <span style={{ display: "inline-flex", cursor: "help" }}>
          <InfoIcon />
        </span>
      </Tooltip>
    </Group>
  ) : (
    label
  );

  return (
    <Stack gap={hasSlider ? 4 : 0}>
      <NumberInput
        id={id}
        label={labelNode}
        placeholder={placeholderText}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        allowNegative={allowNegative ?? false}
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
      {hasSlider && (
        <Slider
          value={clampedSliderValue}
          onChange={onChange}
          min={sliderMin}
          max={sliderMax}
          step={sliderStep ?? step ?? 1}
          disabled={disabled}
          size="xs"
          label={null}
          mt={2}
        />
      )}
    </Stack>
  );
}
