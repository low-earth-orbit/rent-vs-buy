"use client";

import {
  Alert,
  Badge,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconChartLine,
  IconTrendingDown,
  IconTrendingUp,
  IconAlertTriangle,
} from "@tabler/icons-react";
import GlidePathChart from "./GlidePathChart";
import { formatCAD } from "@/utils/format";
import type {
  GlidePathInput,
  GlidePathResult,
  SlopeDir,
} from "@/utils/glide-path/types";

interface ResultProps {
  input: GlidePathInput;
  result: GlidePathResult | null;
  computing: boolean;
  hasErrors: boolean;
}

function Metric({
  label,
  value,
  note,
  flagged = false,
}: {
  label: string;
  value: string;
  note?: string;
  flagged?: boolean;
}) {
  return (
    <Stack gap={2}>
      <Text size="sm">{label}</Text>
      <Group gap={6}>
        <Text fw={600} fz="md">
          {value}
        </Text>
        {flagged && (
          <IconAlertTriangle size={16} color="var(--mantine-color-yellow-6)" />
        )}
      </Group>
      {note && (
        <Text size="xs" c="dimmed">
          {note}
        </Text>
      )}
    </Stack>
  );
}

function OutcomeCard({
  title,
  ceIncome,
  ceDegenerate,
  drawdownDepletion,
  fullPathShortfall,
}: {
  title: string;
  ceIncome: number;
  ceDegenerate: boolean;
  drawdownDepletion: number;
  fullPathShortfall: number;
}) {
  return (
    <Card withBorder radius="sm" padding="md">
      <Stack gap="md">
        <Text fw={600}>{title}</Text>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <Metric
            label="CE income"
            value={
              ceDegenerate ? "Tail-dominated" : `${formatCAD(ceIncome)}/yr`
            }
            note={
              ceDegenerate
                ? "bad tails overwhelm the score"
                : "risk-adjusted lifetime income"
            }
            flagged={ceDegenerate}
          />
          <Metric
            label="Drawdown depletion"
            value={`${(drawdownDepletion * 100).toFixed(1)}%`}
            note="from expected retirement savings"
            flagged={drawdownDepletion >= RISK_HIGHLIGHT_THRESHOLD}
          />
          <Metric
            label="Full-path shortfall"
            value={`${(fullPathShortfall * 100).toFixed(1)}%`}
            note="includes pre-retirement markets"
            flagged={fullPathShortfall >= RISK_HIGHLIGHT_THRESHOLD}
          />
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

const DIR_COLOR: Record<SlopeDir, string> = {
  Rising: "teal",
  Falling: "indigo",
  Flat: "gray",
  "n/a": "gray",
};

/** The accumulation/retirement slope badges + tent description for the glide path. */
function GlideShape({
  input,
  result,
}: {
  input: GlidePathInput;
  result: GlidePathResult;
}) {
  const retireAge = input.startAge + result.params.accumYears;
  return (
    <>
      <Group gap="xs" wrap="wrap">
        <Badge
          variant="light"
          color={DIR_COLOR[result.accumDir]}
          leftSection={<IconTrendingDown size={12} />}
          size="lg"
        >
          Accumulation: {result.accumDir}
        </Badge>
        <Badge
          variant="light"
          color={DIR_COLOR[result.retireDir]}
          leftSection={<IconTrendingUp size={12} />}
          size="lg"
        >
          Retirement: {result.retireDir}
        </Badge>
      </Group>
      <Text size="sm" c="dimmed">
        {result.tentPct != null && result.tentAge != null ? (
          <>
            The equity weight bottoms at{" "}
            <Text span fw={600} c="bright">
              {result.tentPct}%
            </Text>{" "}
            around age {result.tentAge}, near retirement (age {retireAge}).
          </>
        ) : (
          <>Equity weight is set per {result.params.interval}-year step.</>
        )}
      </Text>
    </>
  );
}

const SIMPLICITY_THRESHOLD_PCT = 5;
const RISK_HIGHLIGHT_THRESHOLD = 0.1;

/**
 * A CE income this far below the target is the FLOOR=1 / CRRA artifact (the certainty-equivalent
 * collapses toward zero when consumption hits the floor in a meaningful share of paths), not a
 * real planning figure. We use it to suppress percentage comparisons against a degenerate
 * denominator; depletion rate is the pass/fail signal.
 */
function ceIsDegenerate(income: number, targetIncome: number): boolean {
  return income < Math.max(1000, 0.05 * targetIncome);
}

/**
 * Prefer the simpler constant allocation when it wins all comparable outcomes or comes within
 * the simplicity threshold on CE income, drawdown depletion, or full-path shortfall.
 */
function Recommendation({
  input,
  result,
}: {
  input: GlidePathInput;
  result: GlidePathResult;
}) {
  const flatPct = result.flatEquityPct.toFixed(0);
  const glideBad = ceIsDegenerate(result.ceIncome, input.targetIncome);
  const flatBad = ceIsDegenerate(result.flatCeIncome, input.targetIncome);
  const ceWithin =
    !flatBad &&
    (glideBad ||
      result.flatCeIncome >=
        result.ceIncome * (1 - SIMPLICITY_THRESHOLD_PCT / 100));
  const drawdownWithin =
    result.flatDrawdownDepletion <=
    result.drawdownDepletion + SIMPLICITY_THRESHOLD_PCT / 100;
  const fullPathWithin =
    result.flatDepletion <= result.depletion + SIMPLICITY_THRESHOLD_PCT / 100;
  const constantWinsAll =
    result.flatCeIncome >= result.ceIncome &&
    result.flatDrawdownDepletion <= result.drawdownDepletion &&
    result.flatDepletion <= result.depletion;
  const preferConstant =
    !flatBad &&
    (glideBad ||
      constantWinsAll ||
      ceWithin ||
      drawdownWithin ||
      fullPathWithin);

  const reasons = constantWinsAll
    ? ["it wins all three comparable outcomes"]
    : [
        ceWithin ? "CE income is within 5%" : null,
        drawdownWithin ? "drawdown depletion is within 5%" : null,
        fullPathWithin ? "full-path shortfall is within 5%" : null,
      ].filter(Boolean);

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Title order={3} fz="md">
              Allocation options
            </Title>
            <Text size="sm" c="dimmed">
              Both are viable comparisons; the preferred option applies a
              simplicity bias toward the constant allocation.
            </Text>
          </Stack>
          <Badge color="teal" variant="filled">
            Preferred: {preferConstant ? `constant ${flatPct}%` : "glide path"}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Card withBorder radius="sm" padding="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={600}>Optimized glide path</Text>
                {!preferConstant && <Badge variant="light">Preferred</Badge>}
              </Group>
              <GlideShape input={input} result={result} />
            </Stack>
          </Card>
          <Card withBorder radius="sm" padding="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={600}>Constant {flatPct}% equity</Text>
                {preferConstant && <Badge variant="light">Preferred</Badge>}
              </Group>
              <Text size="sm" c="dimmed">
                Hold the same stock/bond allocation at every age. Simpler to
                implement and maintain.
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>

        <Text size="xs" c="dimmed">
          {preferConstant
            ? `The constant allocation is preferred because ${reasons.join(" and ")}.`
            : "The glide path is preferred because the constant allocation trails it by more than the simplicity threshold on every comparable outcome."}
        </Text>
      </Stack>
    </Card>
  );
}

export default function Result({
  input,
  result,
  computing,
  hasErrors,
}: ResultProps) {
  if (hasErrors) {
    return (
      <Alert
        variant="light"
        color="gray"
        icon={<IconInfoCircle />}
        title="Incomplete inputs"
      >
        Fix the highlighted fields to compare your allocation options.
      </Alert>
    );
  }

  if (computing) {
    return (
      <Center mih={400}>
        <Stack align="center" gap="md">
          <Loader size="xl" />
          <Text size="sm" c="dimmed" ta="center">
            Optimizing your allocation paths…
            <br />
            This may take a few moments.
          </Text>
        </Stack>
      </Center>
    );
  }

  if (!result) {
    return (
      <Center mih={400}>
        <Stack align="center" gap="md">
          <ThemeIcon size={56} variant="light" color="teal" radius="xl">
            <IconChartLine size={30} />
          </ThemeIcon>
          <Stack gap={4} align="center">
            <Text fw={600}>Ready to optimize</Text>
            <Text size="sm" c="dimmed" ta="center" maw={300}>
              Fill in your details, then click{" "}
              <Text span fw={600}>
                Compare allocation paths
              </Text>{" "}
              to find your personalized equity allocation.
            </Text>
          </Stack>
        </Stack>
      </Center>
    );
  }

  const incomeDegenerate = ceIsDegenerate(result.ceIncome, input.targetIncome);
  const flatDegenerate = ceIsDegenerate(
    result.flatCeIncome,
    input.targetIncome,
  );

  return (
    <Stack gap="lg" pos="relative">
      <Recommendation input={input} result={result} />

      <Card withBorder radius="md" padding="lg">
        <Title order={3} fz="md" mb="md">
          Projected outcomes
        </Title>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <OutcomeCard
            title="Optimized glide path"
            ceIncome={result.ceIncome}
            ceDegenerate={incomeDegenerate}
            drawdownDepletion={result.drawdownDepletion}
            fullPathShortfall={result.depletion}
          />
          <OutcomeCard
            title={`Constant ${result.flatEquityPct.toFixed(0)}% equity`}
            ceIncome={result.flatCeIncome}
            ceDegenerate={flatDegenerate}
            drawdownDepletion={result.flatDrawdownDepletion}
            fullPathShortfall={result.flatDepletion}
          />
        </SimpleGrid>
      </Card>

      <GlidePathChart
        input={input}
        result={result}
        showConstant={!flatDegenerate}
      />
    </Stack>
  );
}
