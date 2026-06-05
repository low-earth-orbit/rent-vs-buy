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
const DEPLETION_WARNING_THRESHOLD = 0.1;
const SEVERE_DEPLETION_THRESHOLD = 0.25;
const MEANINGFUL_ACCUMULATION_GAP = 0.05;

type PlanRiskKind = "low" | "drawdown" | "accumulation-sensitive" | "combined";

/** Classifies overall plan risk without treating the full-path gap as a causal decomposition. */
function classifyPlanRisk(result: GlidePathResult): PlanRiskKind {
  const drawdownNotable =
    result.drawdownDepletion >= DEPLETION_WARNING_THRESHOLD;
  const fullPathNotable = result.depletion >= DEPLETION_WARNING_THRESHOLD;
  const accumulationSensitive =
    result.depletion - result.drawdownDepletion > MEANINGFUL_ACCUMULATION_GAP;

  if (drawdownNotable && accumulationSensitive) return "combined";
  if (drawdownNotable) return "drawdown";
  if (fullPathNotable && accumulationSensitive) {
    return "accumulation-sensitive";
  }
  return "low";
}

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
  const flatPct = result.flatEquityPct.toFixed(0);
  const glideBad = ceIsDegenerate(result.ceIncome, input.targetIncome);
  const flatBad = ceIsDegenerate(result.flatCeIncome, input.targetIncome);
  const failingPlan = result.drawdownDepletion >= DEPLETION_WARNING_THRESHOLD;
  const flatFailingPlan =
    result.flatDrawdownDepletion >= DEPLETION_WARNING_THRESHOLD;

  if (failingPlan && !flatFailingPlan) {
    return (
      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Group gap="xs">
            <Title order={3} fz="md">
              Recommended: hold a constant {flatPct}% equity
            </Title>
            <Badge color="teal" variant="filled">
              Lower drawdown risk
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            The optimized glide is shown below, but its drawdown depletion rate
            is {(result.drawdownDepletion * 100).toFixed(1)}%. The constant{" "}
            {flatPct}% allocation keeps the drawdown-only rate to{" "}
            {(result.flatDrawdownDepletion * 100).toFixed(1)}% in the
            out-of-sample check.
          </Text>
          <Divider
            my={4}
            label="The optimized glide, for reference"
            labelPosition="left"
          />
          <GlideShape input={input} result={result} />
        </Stack>
      </Card>
    );
  }

  // Whenever the constant comparator fails the drawdown bar AND is riskier than the glide,
  // recommend the glide — even if the glide also fails. The CE-income comparison is
  // tail-dominated in that regime (e.g. a long pre-pension bridge) and can rank the fragile
  // constant above the safer glide; depletion is the robust signal, so defer to it. (This
  // generalizes the earlier "glide safe, constant failing" case to the both-failing case.)
  if (
    flatFailingPlan &&
    result.flatDrawdownDepletion > result.drawdownDepletion
  ) {
    return (
      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Group gap="xs">
            <Title order={3} fz="md">
              Recommended glide path
            </Title>
            <Badge color="teal" variant="filled">
              Lower drawdown risk
            </Badge>
          </Group>
          <GlideShape input={input} result={result} />
          <Text size="xs" c="dimmed">
            The best constant allocation has a higher
            certainty-equivalent-income score, but it depletes in{" "}
            {(result.flatDrawdownDepletion * 100).toFixed(1)}% of drawdown-only
            markets. The optimized glide keeps that rate to{" "}
            {(result.drawdownDepletion * 100).toFixed(1)}%.
          </Text>
        </Stack>
      </Card>
    );
  }

  if (glideBad && !flatBad) {
    return (
      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Group gap="xs">
            <Title order={3} fz="md">
              Recommended: hold a constant {flatPct}% equity
            </Title>
            <Badge color="teal" variant="filled">
              More robust
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            The optimized glide is shown below, but its certainty-equivalent
            income is tail-dominated: rare low-income paths overwhelm the score.
            A fixed {flatPct}% stock allocation has a cleaner out-of-sample
            income score in this simulation and is easier to hold.
          </Text>
          <Divider
            my={4}
            label="The optimized glide, for reference"
            labelPosition="left"
          />
          <GlideShape input={input} result={result} />
        </Stack>
      </Card>
    );
  }

  // No allocation reliably funds the plan — the income figure is the floor artifact, not a
  // real number. Don't pick a "winner" or show a percentage; defer to the failure warning.
  if (glideBad && flatBad && failingPlan) {
    return (
      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Title order={3} fz="md">
            No allocation reliably funds this plan
          </Title>
          <Text size="sm" c="dimmed">
            In a meaningful share of simulated markets the portfolio can&apos;t
            cover your target income, so no stock/bond mix produces a dependable
            result (see the warning below). The optimizer&apos;s best effort is
            shown for reference.
          </Text>
          <Divider my={4} label="Best-effort glide path" labelPosition="left" />
          <GlideShape input={input} result={result} />
        </Stack>
      </Card>
    );
  }

  if (glideBad && flatBad) {
    return (
      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Group gap="xs">
            <Title order={3} fz="md">
              Recommended glide path
            </Title>
            <Badge color="teal" variant="filled">
              Low ruin risk
            </Badge>
          </Group>
          <GlideShape input={input} result={result} />
          <Text size="xs" c="dimmed">
            The chance of depleting the portfolio is low, but rare bridge-period
            shortfalls dominate the certainty-equivalent income score. Treat the
            income comparison as tail-sensitive and focus on the depletion rate.
          </Text>
        </Stack>
      </Card>
    );
  }

  // The glide funds the plan but the best constant weight is degenerate — recommend the glide
  // without a meaningless percentage against a near-zero denominator.
  if (flatBad) {
    return (
      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Group gap="xs">
            <Title order={3} fz="md">
              Recommended glide path
            </Title>
            <Badge color="teal" variant="filled">
              Materially better
            </Badge>
          </Group>
          <GlideShape input={input} result={result} />
          <Text size="xs" c="dimmed">
            A single constant allocation has a tail-dominated
            certainty-equivalent income score, so the glide path&apos;s ability
            to shift risk over time matters here — there is no simpler
            equivalent.
          </Text>
        </Stack>
      </Card>
    );
  }

  const edgePct =
    result.flatCeIncome > 0 ? (edge / result.flatCeIncome) * 100 : 0;

  if (edgePct <= -RECOMMEND_FLAT_BELOW_PCT) {
    return (
      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Group gap="xs">
            <Title order={3} fz="md">
              Recommended: hold a constant {flatPct}% equity
            </Title>
            <Badge color="teal" variant="filled">
              More robust
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            The optimized glide is shown below, but a fixed {flatPct}% stock
            allocation has about {Math.abs(edgePct).toFixed(1)}% higher
            certainty-equivalent income in the out-of-sample check and is easier
            to hold.
          </Text>
          <Divider
            my={4}
            label="The optimized glide, for reference"
            labelPosition="left"
          />
          <GlideShape input={input} result={result} />
        </Stack>
      </Card>
    );
  }

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

/** Presents one coherent warning for drawdown risk, accumulation sensitivity, or both. */
function PlanRiskAlert({
  input,
  result,
}: {
  input: GlidePathInput;
  result: GlidePathResult;
}) {
  const risk = classifyPlanRisk(result);
  if (risk === "low") return null;

  const severe = result.drawdownDepletion >= SEVERE_DEPLETION_THRESHOLD;
  const retireAge = input.startAge + result.params.accumYears;
  const drawdownPct = (result.drawdownDepletion * 100).toFixed(1);
  const fullPathPct = (result.depletion * 100).toFixed(1);

  if (risk === "drawdown") {
    return (
      <Alert
        variant="light"
        color={severe ? "red" : "yellow"}
        icon={<IconAlertTriangle />}
        title="Retirement spending may not be sustainable"
      >
        <Text size="sm">
          Starting retirement with the expected balance of{" "}
          <Text span fw={600}>
            {formatCAD(result.expectedRetirementBalance)}
          </Text>
          , the portfolio is depleted before age {input.planningAge} in{" "}
          <Text span fw={600}>
            {drawdownPct}%
          </Text>{" "}
          of simulated retirement markets. Consider saving more, retiring later,
          or lowering your target income.
        </Text>
      </Alert>
    );
  }

  if (risk === "accumulation-sensitive") {
    return (
      <Alert
        variant="light"
        color="yellow"
        icon={<IconAlertTriangle />}
        title="Reaching the expected retirement balance matters"
      >
        <Text size="sm">
          Drawdown depletion is{" "}
          <Text span fw={600}>
            {drawdownPct}%
          </Text>{" "}
          when retirement begins with the expected age-{retireAge} balance of{" "}
          <Text span fw={600}>
            {formatCAD(result.expectedRetirementBalance)}
          </Text>
          . Across simulations beginning at age {input.startAge}, full-path
          shortfall is{" "}
          <Text span fw={600}>
            {fullPathPct}%
          </Text>
          . The gap indicates sensitivity to pre-retirement market performance.
        </Text>
      </Alert>
    );
  }

  return (
    <Alert
      variant="light"
      color={severe ? "red" : "yellow"}
      icon={<IconAlertTriangle />}
      title="Funding risk exists before and after retirement"
    >
      <Text size="sm">
        Starting retirement with the expected age-{retireAge} balance of{" "}
        <Text span fw={600}>
          {formatCAD(result.expectedRetirementBalance)}
        </Text>
        , the portfolio is depleted before age {input.planningAge} in{" "}
        <Text span fw={600}>
          {drawdownPct}%
        </Text>{" "}
        of simulated retirement markets. Across simulations beginning at age{" "}
        {input.startAge}, full-path shortfall is{" "}
        <Text span fw={600}>
          {fullPathPct}%
        </Text>{" "}
        and the gap indicates sensitivity to pre-retirement market performance.
        Consider saving more, retiring later, or lowering your target income.
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

  const incomeDegenerate = ceIsDegenerate(result.ceIncome, input.targetIncome);
  const flatDegenerate = ceIsDegenerate(
    result.flatCeIncome,
    input.targetIncome,
  );

  return (
    <Stack gap="lg" pos="relative">
      <Recommendation input={input} result={result} />

      <PlanRiskAlert input={input} result={result} />

      <Card withBorder radius="md" padding="lg">
        <Title order={3} fz="md" mb="md">
          Projected outcomes
        </Title>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="lg">
          <Metric
            label="CE income"
            value={
              incomeDegenerate
                ? "Tail-dominated"
                : `${formatCAD(result.ceIncome)}/yr`
            }
            note={
              incomeDegenerate
                ? "full-path bad tails overwhelm the score"
                : "full-path certainty-equivalent, today's $"
            }
          />
          <Metric
            label="Drawdown depletion"
            value={`${(result.drawdownDepletion * 100).toFixed(1)}%`}
            note="from expected retirement savings"
          />
          <Metric
            label="Full-path shortfall"
            value={`${(result.depletion * 100).toFixed(1)}%`}
            note="includes pre-retirement markets"
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

      <GlidePathChart
        input={input}
        result={result}
        showConstant={!flatDegenerate}
      />
    </Stack>
  );
}
