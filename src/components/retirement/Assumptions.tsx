import { Container, Text } from "@mantine/core";

/**
 * Transparency note on the (intentionally simplified) prototype model.
 */
const Assumptions = () => {
  return (
    <Container size="xl" pt="xl" pb="xs">
      <Text size="sm" c="dimmed">
        This is a quick reality check, not a full retirement plan. Results are
        shown in today&apos;s dollars, use a single expected return before and
        after retirement, and assume a constant gross retirement income target.
        They are rough estimates, not financial advice.
      </Text>
    </Container>
  );
};

export default Assumptions;
