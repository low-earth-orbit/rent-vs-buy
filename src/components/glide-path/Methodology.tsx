import { Anchor, Container, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

function Point({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
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
      <Stack gap="md">
        <Title order={2} fz="xl">
          How this works — and why it&apos;s &ldquo;optimal&rdquo;
        </Title>

        <Text size="sm" c="dimmed">
          Most glide-path rules (e.g. &ldquo;100 minus your age&rdquo;,
          target-date funds) are heuristics — they have no explicit link to your
          income target, risk tolerance, or guaranteed income. This tool derives
          an allocation from first principles instead.
        </Text>

        <Title order={3} fz="md">
          What &ldquo;optimal&rdquo; means here
        </Title>
        <Text size="sm" c="dimmed">
          The optimizer finds the equity weight at each age that maximizes your{" "}
          <Text span fw={600}>
            expected utility of retirement consumption
          </Text>
          , scored with a{" "}
          <Text span fw={600}>
            CRRA (constant relative risk aversion)
          </Text>{" "}
          function — so a dollar of spending counts for more when you&apos;d
          otherwise fall short than when you&apos;re already comfortable. Two
          preferences shape the curve:{" "}
          <Text span fw={600}>
            γ
          </Text>{" "}
          sets how much you dislike swings in retirement spending (higher →
          safer, lower-equity plans), and{" "}
          <Text span fw={600}>
            β
          </Text>{" "}
          sets how much you front-load spending into your earlier, more active
          retirement years. The result is the best{" "}
          <Text span fw={600}>
            risk-adjusted outcome for your situation
          </Text>{" "}
          — not the highest expected return, and not the least volatile.
        </Text>
        <Text size="sm" c="dimmed">
          It maximizes welfare, not success rate: where no stock/bond mix can
          close a funding gap, the fix lives in your inputs (retire later, spend
          less, save more), not the allocation. Guaranteed income is assumed to
          start at retirement and be paid every year — a pre-pension
          &ldquo;bridge&rdquo; is out of scope (use the retirement tool for that
          funding question). Income shortfall — a year the portfolio can&apos;t
          fund your targeted spending — is reported two ways: drawdown-only
          (from the expected retirement balance) and full-path (which also
          includes pre-retirement market luck). See the analysis note below for
          how γ and β enter the objective and typical values for each.
        </Text>

        <Title order={3} fz="md">
          How it optimizes
        </Title>
        <Text size="sm" c="dimmed">
          The optimizer runs{" "}
          <Text span fw={600}>
            Monte Carlo coordinate ascent
          </Text>
          : it holds every age&apos;s weight fixed but one, scans all candidate
          equity weights for that age on a shared set of simulated market paths
          (common random numbers), keeps the best, then repeats for every other
          age — cycling until nothing improves. No parametric shape (flat,
          rising, falling) is assumed; the shape emerges from the math. Returns
          are drawn from our PWL / FP-Canada capital-market curve in real
          (today&apos;s) dollars, with no historical data and no mean reversion
          — so any shape the optimizer prefers is robust to the absence of a
          valuation signal.
        </Text>

        <Title order={3} fz="md">
          Key findings
        </Title>
        <Point heading="The spending rule sets the shape.">
          Rigid constant-$ spending causes the optimizer to derisk into a
          &ldquo;bond tent&rdquo; near retirement to protect against a bad
          sequence of returns right when you stop earning. Flexible spending
          (income moves with the market) removes that risk — the optimizer stays
          near 100% equity throughout.
        </Point>
        <Point heading="The shape is worth little; the level matters.">
          Out of sample, the full per-age glide path beats the best single flat
          weight by only ~0.5% of certainty-equivalent income — but picking the
          wrong level (e.g. 100% equity under constant-$ spending) can cost
          $650–$2,000/yr. Getting the level right matters far more than
          optimizing the curve. That is why we also report the best{" "}
          <Text span fw={600}>
            constant
          </Text>{" "}
          equity weight: since its outcome is nearly identical and a single
          fixed allocation is far easier to hold through market swings, it is
          often the more practical choice.
        </Point>
        <Point heading="Guaranteed income is your bond floor.">
          A larger guaranteed income (CPP + OAS + DB) lets the portfolio take
          more equity risk because it already covers some downside. With no
          guaranteed income, rare depleted years dominate CRRA utility, so the
          allocation comparison is shown as inconclusive.
        </Point>

        <Text size="sm" c="dimmed">
          Full methodology:{" "}
          <Anchor
            href="https://github.com/low-earth-orbit/personal-finance/blob/main/docs/glidepath-analysis.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            glide-path analysis note
          </Anchor>
          . Runs in your browser — nothing is sent anywhere. This is an
          illustration, not financial advice.
        </Text>
      </Stack>
    </Container>
  );
}
