import { useState } from "react";
import { Group, NumberInput, Popover, Text } from "@mantine/core";

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
  onChange,
  thousandSeparator,
  disabled,
  allowNegative,
  error,
  ...rest
}) {
  const [opened, setOpened] = useState(false);

  const labelNode = helperText ? (
    <Group
      gap={4}
      wrap="nowrap"
      display="inline-flex"
      style={{ alignItems: "center" }}
    >
      <span>{label}</span>
      <Popover
        opened={opened}
        onChange={setOpened}
        width={260}
        withArrow
        shadow="md"
        position="top-start"
      >
        <Popover.Target>
          <span
            style={{ display: "inline-flex", cursor: "pointer" }}
            onClick={(e) => {
              e.preventDefault();
              setOpened((o) => !o);
            }}
          >
            <InfoIcon />
          </span>
        </Popover.Target>
        <Popover.Dropdown>
          <Text size="sm">{helperText}</Text>
        </Popover.Dropdown>
      </Popover>
    </Group>
  ) : (
    label
  );

  return (
    <NumberInput
      id={id}
      label={labelNode}
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
