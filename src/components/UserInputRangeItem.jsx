import { Anchor, Group, NumberInput, Stack, Text } from "@mantine/core";
import FieldLabel from "./FieldLabel";

const fmt = (n) => String(Number(Number(n).toFixed(2)));

export default function UserInputRangeItem({
  baseField,
  sigmaField,
  label,
  helperText,
  baseValue,
  sigma,
  baseConstraint,
  sigmaConstraint,
  onBaseChange,
  onSigmaChange,
  baseError,
  expanded,
  onToggleExpand,
  disabled,
}) {
  const sigmaNum = +sigma || 0;
  const baseNum = +baseValue || 0;
  const low = baseNum - 2 * sigmaNum;
  const high = baseNum + 2 * sigmaNum;
  const rangeKnown =
    baseValue !== "" &&
    baseValue != null &&
    sigma !== "" &&
    sigma != null;

  const composedLabel = (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <FieldLabel label={label} helperText={helperText} />
      <Anchor
        component="button"
        type="button"
        size="xs"
        c="dimmed"
        underline="hover"
        onClick={onToggleExpand}
        disabled={disabled}
        style={{
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? "none" : "auto",
        }}
      >
        {expanded ? "remove" : "± add uncertainty"}
      </Anchor>
    </Group>
  );

  return (
    <Stack gap={4}>
      <NumberInput
        id={baseField}
        label={composedLabel}
        value={baseValue}
        onChange={onBaseChange}
        error={baseError}
        suffix="%"
        disabled={disabled}
        allowNegative={baseConstraint.allowNegative ?? false}
        min={baseConstraint.min}
        max={baseConstraint.max}
        step={baseConstraint.step}
        clampBehavior="none"
      />
      {expanded && (
        <>
          <NumberInput
            id={sigmaField}
            size="xs"
            value={2 * sigmaNum}
            onChange={(v) => {
              if (v === "" || v == null) {
                onSigmaChange(v);
              } else {
                onSigmaChange(+v / 2);
              }
            }}
            prefix="± "
            suffix="%"
            min={0}
            max={2 * sigmaConstraint.max}
            step={2 * sigmaConstraint.step}
            disabled={disabled}
            clampBehavior="none"
            allowNegative={false}
          />
          <Text size="xs" c="dimmed">
            {rangeKnown
              ? `range ${fmt(low)}% to ${fmt(high)}%`
              : "range —"}
          </Text>
        </>
      )}
    </Stack>
  );
}
