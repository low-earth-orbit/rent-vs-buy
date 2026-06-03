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
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
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

function ShapeSummary({
  input,
  result,
}: {
  input: GlidePathInput;
  result: GlidePathResult;
}) {
  const retireAge = input.currentAge + result.params.accumYears;
  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Group gap="xs" wrap="wrap">
          <Text>📉 Accumulation</Text>
          <Badge variant="light" color={DIR_COLOR[result.accumDir]}>
            {result.accumDir}
          </Badge>
          <Text c="dimmed">·</Text>
          <Text>📈 Retirement</Text>
          <Badge variant="light" color={DIR_COLOR[result.retireDir]}>
            {result.retireDir}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {result.tentPct != null && result.tentAge != null ? (
            <>
              The recommended equity weight bottoms at{" "}
              <Text span fw={600} c="bright">
                {result.tentPct}%
              </Text>{" "}
              around age {result.tentAge}, near retirement (age {retireAge}).
            </>
          ) : (
            <>
              Equity weight is recommended per {result.params.interval}-year
              step.
            </>
          )}
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
        Fix the highlighted fields to see your recommended glide path.
      </Alert>
    );
  }

  if (!result) {
    return (
      <Center mih={320}>
        <Stack align="center" gap="sm">
          <Loader />
          <Text size="sm" c="dimmed">
            Optimizing your glide path…
          </Text>
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
      {computing && (
        <Group gap={6} c="dimmed">
          <Loader size="xs" />
          <Text size="xs">Recomputing…</Text>
        </Group>
      )}

      <ShapeSummary input={input} result={result} />

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Metric
          label="CE income"
          value={`${formatCAD(result.ceIncome)}/yr`}
          note="certainty-equivalent"
        />
        <Metric
          label="Depletion"
          value={`${(result.depletion * 100).toFixed(1)}%`}
          note="of simulated markets"
        />
        <Metric
          label="Income variability"
          value={`${(result.incomeCv * 100).toFixed(0)}%`}
          note="lower = steadier"
        />
        <Metric
          label="Median estate"
          value={formatCAD(result.medianBequest)}
          note={estateNote}
        />
      </SimpleGrid>

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
                    ? `–${input.currentAge + b.yearEnd}`
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
