import { Input, RangeSlider, Stack, Text } from "@mantine/core";
import FieldLabel from "./FieldLabel";

const fmt = (n) => String(Number(Number(n).toFixed(2)));
const defaultFormatter = (v) => `${fmt(v)}%`;

export default function UserInputRangeItem({
  label,
  helperText,
  baseValue,
  sigma,
  bounds,
  onChange,
  disabled,
  maxOverride,
  formatter,
}) {
  const trackMax =
    maxOverride != null ? Math.min(bounds.max, maxOverride) : bounds.max;

  const low = Math.max(bounds.min, baseValue - 2 * sigma);
  const high = Math.min(trackMax, baseValue + 2 * sigma);

  const fmtValue = formatter ?? defaultFormatter;

  return (
    <Stack gap={4}>
      <Input.Label>
        <FieldLabel label={label} helperText={helperText} />
      </Input.Label>
      <RangeSlider
        size="xs"
        min={bounds.min}
        max={trackMax}
        step={bounds.step}
        minRange={0}
        value={[low, high]}
        onChange={onChange}
        disabled={disabled}
        label={fmtValue}
        mt={4}
        mb={4}
      />
      <Text size="xs" c="dimmed">
        expected {fmtValue(baseValue)} · range {fmtValue(low)}–{fmtValue(high)}
      </Text>
    </Stack>
  );
}
