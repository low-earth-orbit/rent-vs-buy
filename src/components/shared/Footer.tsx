import { Anchor, Container, Stack, Text } from "@mantine/core";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Container component="footer" size="xl" pt="xl" pb="xl">
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Disclaimer: An educational tool, not financial advice. Results are
          estimates provided as-is.
        </Text>
        <Text size="sm" c="dimmed">
          Copyright © 2023–{currentYear} Leo Hong ·{" "}
          <Anchor
            href="https://github.com/low-earth-orbit/personal-finance"
            target="_blank"
            rel="noreferrer"
            c="dimmed"
          >
            GitHub
          </Anchor>
        </Text>
      </Stack>
    </Container>
  );
};

export default Footer;
