import { Anchor, Container, Stack, Text } from "@mantine/core";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Container component="footer" size="xl" pt="xl" pb="xl">
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          This calculator uses a cash-flow method to compare renting and buying
          on an equal footing. Each year, the renter invests the surplus that
          the buyer spends on ownership costs (mortgage payments, property tax,
          maintenance, and insurance) above what the renter pays in rent. At the
          end of the holding period, the owner sells the home — net of selling
          costs and remaining mortgage balance — while the renter liquidates the
          portfolio net of capital gains tax. The option that leaves more
          after-tax net worth wins. See also:{" "}
          <Anchor
            href="http://www.holypotato.net/?p=1235"
            target="_blank"
            rel="noreferrer"
            c="dimmed"
          >
            John Robertson
          </Anchor>{" "}
          and{" "}
          <Anchor
            href="https://research-tools.pwlcapital.com/research/rent-vs-buy"
            target="_blank"
            rel="noreferrer"
            c="dimmed"
          >
            PWL Capital
          </Anchor>{" "}
          calculators.
        </Text>
        <Text size="sm" c="dimmed">
          {`Disclaimer: This tool is provided as-is. It's not financial advice.`.toUpperCase()}
        </Text>
        <Text size="sm" c="dimmed">
          Copyright © 2023–{currentYear} Leo Hong ·{" "}
          <Anchor
            href="https://github.com/low-earth-orbit/rent-vs-buy"
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
