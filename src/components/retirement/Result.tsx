"use client";

import { Alert, Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import Headline from "./Headline";
import ProjectionChart from "./ProjectionChart";
import { formatCAD } from "@/utils/format";
import { computeRetirement } from "@/utils/retirement/projection";
import type {
  RetirementErrors,
  RetirementInput,
  RetirementResult,
} from "@/utils/retirement/types";

interface ResultProps {
  input: RetirementInput;
  errors: RetirementErrors;
}

function Stat({
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
      <Text size="xs" c="dimmed" fw={600}>
        {label}
      </Text>
      <Text fw={700}>{value}</Text>
      {note && (
        <Text size="xs" c="dimmed">
          {note}
        </Text>
      )}
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
  const savingsTarget =
    result.portfolioWithdrawal > 0
      ? result.portfolioWithdrawal / (input.swr / 100)
      : 0;

  return (
    <Card withBorder radius="md" padding="md">
      <Text fw={600} mb="sm">
        Retirement income need
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Stat
          label="Target income"
          value={`${formatCAD(result.targetGrossIncome)} /yr`}
          note="Gross income in today's dollars"
        />
        <Stat
          label="Guaranteed income"
          value={`${formatCAD(result.guaranteedIncome)} /yr`}
          note="CPP, OAS, and pensions"
        />
        <Stat
          label="Portfolio withdrawal"
          value={`${formatCAD(result.portfolioWithdrawal)} /yr`}
          note="The remaining gross income gap"
        />
      </SimpleGrid>
    </Card>
  );
}

export default function Result({ input, errors }: ResultProps) {
  if (Object.keys(errors).length > 0) {
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

  const result = computeRetirement(input);

  return (
    <Stack gap="lg">
      <Headline input={input} result={result} />
      <IncomeSummary input={input} result={result} />
      <ProjectionChart result={result} />
    </Stack>
  );
}
