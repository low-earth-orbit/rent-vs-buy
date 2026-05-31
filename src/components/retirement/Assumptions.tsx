import { Container, Text } from "@mantine/core";

/**
 * Transparency note on the (intentionally simplified) prototype model.
 */
const Assumptions = () => {
  return (
    <Container size="xl" pt="xl" pb="xs">
      <Text size="sm" c="dimmed">
        This is a quick reality check, not a full retirement plan. Results are
        shown in today&apos;s dollars and use a simple glide path — one expected
        return while you&apos;re working and another (usually lower) in
        retirement. It finds the earliest age your savings can fund a constant
        gross income target while keeping your first-year withdrawal within your
        chosen safe rate.
      </Text>
    </Container>
  );
};

export default Assumptions;
