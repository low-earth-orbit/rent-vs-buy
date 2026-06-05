import { Button } from "@mantine/core";
import { IconRotate } from "@tabler/icons-react";

export default function FormResetButton({ onReset }: { onReset: () => void }) {
  return (
    <Button
      variant="transparent"
      color="red"
      leftSection={<IconRotate size={14} />}
      onClick={onReset}
      size="xs"
      mt="md"
      mb="6"
    >
      Reset to defaults
    </Button>
  );
}
