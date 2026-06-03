import { Anchor, Container, Stack, Text, Title } from "@mantine/core";

function Point({ heading, children }: { heading: string; children: string }) {
  return (
    <Text size="sm" c="dimmed">
      <Text span fw={600}>
        {heading}
      </Text>{" "}
      {children}
    </Text>
  );
}

/** Static explainer rendered below the tool. */
export default function Methodology() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="sm">
        <Title order={2} fz="xl">
          How this works
        </Title>
        <Text size="sm" c="dimmed">
          The optimizer searches the equity weight at every interval step to
          maximize expected discounted CRRA utility of retirement consumption —
          by Monte Carlo coordinate ascent under common random numbers, not a
          lookup table. Everything is in today&apos;s (real) dollars with iid
          normal returns from the app&apos;s PWL / FP-Canada capital-market
          curve (no historical data, no mean reversion), so any shape it prefers
          is robust to the absence of a valuation signal. Cash flows are
          mid-year (earning a half-year of return) and a depleted portfolio
          absorbs at zero — matching the methodology of the other tools.
        </Text>
        <Text size="sm" c="dimmed">
          It runs in your browser (a Web Worker), so nothing is sent anywhere.
          Identical inputs give an identical result (seeded). A few things worth
          knowing:
        </Text>
        <Point heading="The spending rule sets the shape.">
          Rigid constant-$ spending derisks into a tent near retirement;
          flexible spending wants flat, high equity throughout.
        </Point>
        <Point heading="The shape is worth little; the level matters.">
          Out of sample, the full glide beats the best single flat weight by
          only a small CE margin — but the right level is decidedly not always
          100%.
        </Point>
        <Point heading="Leverage is modest.">
          Borrowing to hold &gt;100% equity helps only where the risk-adjusted
          gain beats the borrowing drag — usually a small early-accumulation
          tilt under a low γ.
        </Point>
        <Point heading="One γ by design.">
          The declining glide emerges from the savings horizon, not a changing
          risk aversion, so there is no separate accumulation γ and no γ(age)
          gradient.
        </Point>
        <Text size="xs" c="dimmed">
          Background:{" "}
          <Anchor
            href="https://github.com/low-earth-orbit/personal-finance/blob/main/docs/glidepath-analysis.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            glide-path analysis note
          </Anchor>
          . This is an illustration, not advice.
        </Text>
      </Stack>
    </Container>
  );
}
