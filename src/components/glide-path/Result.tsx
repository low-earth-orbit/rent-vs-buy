"use client";

import {
  Alert,
  Badge,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Table,
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
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <Stack gap={2}>
      <Text size="sm">{label}</Text>
      <Text fw={600} fz="md">
        {value}
      </Text>
      {note && (
        <Text size="xs" c="dimmed">
          {note}
        </Text>
      )}
    </Stack>
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

/** Glide-path edge below this (% of CE income, vs the best constant weight) → lead with the constant. */
const RECOMMEND_FLAT_BELOW_PCT = 5;

/**
 * Adaptive headline. When the glide path beats the best constant allocation by less than
 * RECOMMEND_FLAT_BELOW_PCT, lead with the simpler constant weight (the glide is a marginal
 * refinement); otherwise lead with the glide path. Both are always shown together.
 */
function Recommendation({
  input,
  result,
}: {
  input: GlidePathInput;
  result: GlidePathResult;
}) {
  const edge = result.ceIncome - result.flatCeIncome;
  const edgePct =
    result.flatCeIncome > 0 ? (edge / result.flatCeIncome) * 100 : 0;
  const flatPct = result.flatEquityPct.toFixed(0);

  if (edgePct < RECOMMEND_FLAT_BELOW_PCT) {
    return (
      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Group gap="xs">
            <Title order={3} fz="md">
              Recommended: hold a constant {flatPct}% equity
            </Title>
            <Badge color="teal" variant="filled">
              Simplest
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            A fixed {flatPct}% stock allocation delivers essentially the same
            risk-adjusted income as the optimized glide path
            {edge > 0 ? ` (within ${edgePct.toFixed(1)}%)` : ""}, and is far
            easier to hold for life. The glide path below is an optional
            refinement worth little extra.
          </Text>
          <Divider
            my={4}
            label="The glide path, for reference"
            labelPosition="left"
          />
          <GlideShape input={input} result={result} />
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Group gap="xs">
          <Title order={3} fz="md">
            Recommended glide path
          </Title>
          <Badge color="teal" variant="filled">
            +{edgePct.toFixed(1)}% vs constant
          </Badge>
        </Group>
        <GlideShape input={input} result={result} />
        <Text size="xs" c="dimmed">
          A constant {flatPct}% equity is simpler to maintain but gives up about{" "}
          {edgePct.toFixed(1)}% of risk-adjusted income here.
        </Text>
      </Stack>
    </Card>
  );
}

/** Surfaces ruin risk when the portfolio is exhausted in a meaningful share of markets. */
function FailureWarning({
  input,
  result,
}: {
  input: GlidePathInput;
  result: GlidePathResult;
}) {
  const dep = result.depletion;
  if (dep < 0.1) return null;

  const severe = dep >= 0.25;
  const retireAge = input.startAge + result.params.accumYears;
  const delay = result.params.pensionDelayYears;

  return (
    <Alert
      variant="light"
      color={severe ? "red" : "yellow"}
      icon={<IconAlertTriangle />}
      title={
        severe
          ? "High chance of running out of money"
          : "Notable chance of running out of money"
      }
    >
      <Text size="sm">
        The portfolio is exhausted before age {input.planningAge} in{" "}
        <Text span fw={600}>
          {(dep * 100).toFixed(0)}%
        </Text>{" "}
        of simulated markets.
        {delay > 0 && (
          <>
            {" "}
            Most of this risk is the{" "}
            <Text span fw={600}>
              {delay}-year bridge
            </Text>{" "}
            (ages {retireAge}–{retireAge + delay - 1}) before your pension
            starts, when the portfolio funds your entire income alone.
          </>
        )}{" "}
        Because income can collapse toward zero in those scenarios, the
        risk-adjusted Income figure is pulled far down and isn&apos;t a reliable
        number here — focus on this depletion rate, and consider retiring later,
        lowering your target income, or saving more.
      </Text>
    </Alert>
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
        Fix the highlighted fields to see your optimal glide path.
      </Alert>
    );
  }

  if (computing) {
    return (
      <Center mih={400}>
        <Stack align="center" gap="md">
          <Loader size="xl" />
          <Text size="sm" c="dimmed" ta="center">
            Optimizing your glide path…
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
                Generate glide path
              </Text>{" "}
              to find your personalized equity allocation.
            </Text>
          </Stack>
        </Stack>
      </Center>
    );
  }

  const estateNote =
    result.bequestTargetReached === false
      ? `~${result.medianEstateYears} yrs (target not reachable)`
      : `~${result.medianEstateYears} yrs of spending`;

  return (
    <Stack gap="lg" pos="relative">
      <Recommendation input={input} result={result} />

      <FailureWarning input={input} result={result} />

      <Card withBorder radius="md" padding="lg">
        <Title order={3} fz="md" mb="md">
          Projected outcomes
        </Title>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
          <Metric
            label="Income"
            value={`${formatCAD(result.ceIncome)}/yr`}
            note="risk-adjusted, today's $"
          />
          <Metric
            label="Chance of running out"
            value={`${(result.depletion * 100).toFixed(1)}%`}
            note="across simulated markets"
          />
          <Metric
            label="Income swings"
            value={`${(result.incomeCv * 100).toFixed(0)}%`}
            note="lower = steadier"
          />
          <Metric
            label="Median estate"
            value={formatCAD(result.medianBequest)}
            note={estateNote}
          />
        </SimpleGrid>
      </Card>

      <Alert variant="light" color="teal" icon={<IconInfoCircle />}>
        <Text size="sm">
          This allocation is tailored to your inputs — not a rule of thumb like
          “100 minus age.” It maximizes your expected{" "}
          <Text span fw={600}>
            lifetime utility
          </Text>
          : a measure that rewards steady income and penalizes running out far
          more than it rewards windfalls (CRRA utility, set by your γ). See{" "}
          <Text span fw={600}>
            How this works
          </Text>{" "}
          below for the full method.
        </Text>
      </Alert>

      <GlidePathChart input={input} result={result} />

      <Card withBorder radius="md" padding="md">
        <Title order={3} fz="md" mb="sm">
          Schedule
        </Title>
        <Table
          striped
          highlightOnHover
          horizontalSpacing="md"
          verticalSpacing={6}
          fz="sm"
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Age</Table.Th>
              <Table.Th ta="right">Equity</Table.Th>
              <Table.Th>Phase</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {result.schedule.map((b) => (
              <Table.Tr key={b.step}>
                <Table.Td>
                  {b.ageStart}
                  {b.yearEnd > b.yearStart
                    ? `–${input.startAge + b.yearEnd}`
                    : ""}
                </Table.Td>
                <Table.Td ta="right" fw={600}>
                  {b.equityPct.toFixed(0)}%
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {b.phase === "accum" ? "Accumulation" : "Retirement"}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}
