"use client";

import { Alert, Box, Card, Group, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import Headline from "./Headline";
import ProjectionChart from "./ProjectionChart";
import { formatCAD } from "@/utils/format";
import type {
  RetirementInput,
  RetirementResult,
} from "@/utils/retirement/types";

interface ResultProps {
  input: RetirementInput;
  /** Computed in Main; null while inputs are incomplete/invalid. */
  result: RetirementResult | null;
}

const TEAL = "var(--mantine-color-teal-6)";
const INDIGO = "var(--mantine-color-indigo-5)";

function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value?: string;
}) {
  return (
    <Stack gap={0}>
      <Group gap={6} wrap="nowrap">
        <Box
          w={10}
          h={10}
          style={{ borderRadius: 2, backgroundColor: color }}
        />
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </Group>
      {value && (
        <Text fw={600} size="sm">
          {value} /yr
        </Text>
      )}
    </Stack>
  );
}

function IncomeBar({
  guaranteed,
  portfolio,
  total,
}: {
  guaranteed: number;
  portfolio: number;
  total: number;
}) {
  const denom = Math.max(total, 1);
  const guaranteedPct = (Math.min(guaranteed, denom) / denom) * 100;
  const portfolioPct = (portfolio / denom) * 100;
  return (
    <Box
      style={{
        display: "flex",
        height: 26,
        borderRadius: 6,
        overflow: "hidden",
        backgroundColor: "var(--mantine-color-gray-2)",
      }}
    >
      <Box style={{ width: `${guaranteedPct}%`, backgroundColor: TEAL }} />
      <Box style={{ width: `${portfolioPct}%`, backgroundColor: INDIGO }} />
    </Box>
  );
}

function PhaseRow({
  label,
  note,
  guaranteed,
  portfolio,
  total,
}: {
  label: string;
  note: string;
  guaranteed: number;
  portfolio: number;
  total: number;
}) {
  return (
    <Stack gap={4}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text size="sm" fw={500}>
          {label}
        </Text>
        <Text size="xs" c="dimmed" ta="right">
          {note}
        </Text>
      </Group>
      <IncomeBar guaranteed={guaranteed} portfolio={portfolio} total={total} />
    </Stack>
  );
}

function IncomeSummary({
  input,
  result,
}: {
  input: RetirementInput;
  result: RetirementResult;
}) {
  const { targetGrossIncome, guaranteedIncome, portfolioWithdrawal } = result;
  const retireAge = result.earliestRetirementAge;
  const pensionAge = input.pensionStartAge;
  const hasBridge = retireAge != null && retireAge < pensionAge;
  const bridgeRange =
    retireAge === pensionAge - 1
      ? `age ${retireAge}`
      : `age ${retireAge}–${pensionAge - 1}`;

  return (
    <Card withBorder radius="md" padding="md">
      <Text size="sm" fw={600} mb="sm">
        Retirement income {formatCAD(targetGrossIncome)} /yr
      </Text>

      {hasBridge ? (
        <Stack gap="md">
          <PhaseRow
            label={`Before pension · ${bridgeRange}`}
            note={`${formatCAD(targetGrossIncome)} all from savings`}
            guaranteed={0}
            portfolio={targetGrossIncome}
            total={targetGrossIncome}
          />
          <PhaseRow
            label={`From age ${pensionAge}`}
            note={`${formatCAD(guaranteedIncome)} pension + ${formatCAD(
              portfolioWithdrawal,
            )} portfolio`}
            guaranteed={guaranteedIncome}
            portfolio={portfolioWithdrawal}
            total={targetGrossIncome}
          />
          <Group gap="xl">
            <LegendItem color={TEAL} label="Guaranteed (CPP/OAS/pension)" />
            <LegendItem color={INDIGO} label="From your savings" />
          </Group>
        </Stack>
      ) : (
        <>
          <IncomeBar
            guaranteed={guaranteedIncome}
            portfolio={portfolioWithdrawal}
            total={targetGrossIncome}
          />
          <Group mt="sm" gap="xl">
            <LegendItem
              color={TEAL}
              label="Guaranteed (CPP/OAS/pension)"
              value={formatCAD(guaranteedIncome)}
            />
            <LegendItem
              color={INDIGO}
              label="From your portfolio"
              value={formatCAD(portfolioWithdrawal)}
            />
          </Group>
        </>
      )}
    </Card>
  );
}

export default function Result({ input, result }: ResultProps) {
  if (!result) {
    return (
      <Alert
        variant="light"
        color="gray"
        icon={<IconInfoCircle />}
        title="Incomplete inputs"
      >
        Fix the highlighted fields to see your retirement projection.
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <Headline input={input} result={result} />
      <IncomeSummary input={input} result={result} />
      <ProjectionChart result={result} />
    </Stack>
  );
}
