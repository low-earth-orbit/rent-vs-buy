import { Anchor, Container, Stack, Text } from "@mantine/core";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Container size="lg" pt="xl" pb="xl">
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          When people decide to rent or buy a home, they often compare the
          mortgage payment with rent. This is useful but does not represent a
          complete picture, because: (a) unlike rent payments, capital
          investment in a home is partially recoverable upon selling the house;
          and (b) the down payment and subsequent mortgage payments have
          opportunity costs, as they could have been invested in similarly risky
          assets, such as stocks. The opportunity cost for a mortgage may be
          less or greater than the APR of the mortgage. Many people understand
          the first point but not the second one. Indeed, it is more complicated
          than comparing monthly rent vs. mortgage payment. This Rent vs Buy
          calculator helps with this.
        </Text>
        <Text size="sm" c="dimmed">
          In the previous version of this app, I used the{" "}
          <Anchor
            href="https://www.pwlcapital.com/rent-or-own-your-home-5-rule/"
            target="_blank"
            rel="noreferrer"
          >
            5% Rule by Ben Felix
          </Anchor>
          . However, it didn't consider the fees for buying and selling a home
          nor taxes on investment gains. There was also an inaccuracy in
          calculating the capital cost — as the mortgage was paid, the owner no
          longer benefited from the leveraging effect. How many years the owner
          "holds" the property, matters. In the latest version, therefore, the
          cash-flow method, similar to{" "}
          <Anchor
            href="http://www.holypotato.net/?p=1235"
            target="_blank"
            rel="noreferrer"
          >
            This One By Dr. Potato
          </Anchor>{" "}
          (my implementation slightly differs), is used to give a more accurate
          comparison.
        </Text>
        <Text size="sm" c="dimmed">
          {`Disclaimer: This tool is provided as-is. It's not financial advice.`.toUpperCase()}
        </Text>

        <Text size="sm" c="dimmed">
          Copyright © 2023–{currentYear} Leo Hong
        </Text>
      </Stack>
    </Container>
  );
};

export default Footer;
