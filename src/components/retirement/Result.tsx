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

function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
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
      <Text fw={600} size="sm">
        {value} /yr
      </Text>
    </Stack>
  );
}

function IncomeSummary({ result }: { result: RetirementResult }) {
  const { targetGrossIncome, guaranteedIncome, portfolioWithdrawal } = result;
  const total = Math.max(targetGrossIncome, 1);
  const guaranteedPct = (Math.min(guaranteedIncome, total) / total) * 100;
  const portfolioPct = (portfolioWithdrawal / total) * 100;

  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" mb={8}>
        <Text fw={600}>Where your retirement income comes from</Text>
        <Text size="sm" c="dimmed">
          {formatCAD(targetGrossIncome)} /yr target
        </Text>
      </Group>
      <Box
        style={{
          display: "flex",
          height: 28,
          borderRadius: 6,
          overflow: "hidden",
          backgroundColor: "var(--mantine-color-gray-2)",
        }}
      >
        <Box
          style={{
            width: `${guaranteedPct}%`,
            backgroundColor: "var(--mantine-color-teal-6)",
          }}
        />
        <Box
          style={{
            width: `${portfolioPct}%`,
            backgroundColor: "var(--mantine-color-indigo-5)",
          }}
        />
      </Box>
      <Group mt="sm" gap="xl">
        <LegendItem
          color="var(--mantine-color-teal-6)"
          label="Guaranteed (CPP/OAS/pension)"
          value={formatCAD(guaranteedIncome)}
        />
        <LegendItem
          color="var(--mantine-color-indigo-5)"
          label="From your portfolio"
          value={formatCAD(portfolioWithdrawal)}
        />
      </Group>
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
      <IncomeSummary result={result} />
      <ProjectionChart result={result} />
    </Stack>
  );
}
