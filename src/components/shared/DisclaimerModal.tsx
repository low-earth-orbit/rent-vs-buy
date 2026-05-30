import { Button, Group, Modal, Stack, Text } from "@mantine/core";

type DisclaimerModalProps = {
  opened: boolean;
  onAccept: () => void;
};

const DisclaimerModal = ({ opened, onAccept }: DisclaimerModalProps) => {
  function handleLeave() {
    // window.close() only succeeds for script-opened tabs; otherwise fall back
    // to clearing the page so the user doesn't land on the calculator.
    window.close();
    window.location.href = "about:blank";
  }

  return (
    <Modal
      opened={opened}
      onClose={onAccept}
      title="Before you start"
      centered
      size="lg"
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
    >
      <Stack gap="md">
        <Text size="sm">
          An educational tool, not financial advice. Results are estimates from
          your assumptions, not predictions. Canada-specific and provided as-is
          — consult a professional before acting.
        </Text>
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={handleLeave}>
            I&apos;m not sure
          </Button>
          <Button onClick={onAccept}>I understand</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default DisclaimerModal;
