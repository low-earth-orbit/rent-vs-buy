import { useState } from "react";
import { Group, Popover, Text } from "@mantine/core";

const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ opacity: 0.45, flexShrink: 0 }}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
  </svg>
);

export default function FieldLabel({ label, helperText }) {
  const [opened, setOpened] = useState(false);

  if (!helperText) return label;

  return (
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
          <button
            type="button"
            style={{
              display: "inline-flex",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
              color: "inherit",
            }}
            aria-label={`More information about ${label}`}
            aria-haspopup="dialog"
            aria-expanded={opened}
            onClick={(e) => {
              e.preventDefault();
              setOpened((o) => !o);
            }}
          >
            <InfoIcon />
          </button>
        </Popover.Target>
        <Popover.Dropdown>
          <Text size="sm">{helperText}</Text>
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
}
