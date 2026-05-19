import { Alert, Paper, Stack, Text } from "@mantine/core";
import { LineChart } from "@mantine/charts";
import { calculateNetWorthAtYearEnd } from "../utils/math";
import { formatCAD, formatCADCompact } from "../utils/format";

function buildData(userInput) {
  const horizon = 30;
  return Array.from({ length: horizon }, (_, i) =>
    calculateNetWorthAtYearEnd({ ...userInput, yearNumber: i + 1 }),
  );
}

// First sign flip of (renter - owner); linearly interpolate the fractional year.
function findCrossover(data) {
  for (let i = 1; i < data.length; i++) {
    const a = data[i - 1].difference;
    const b = data[i].difference;
    if (a === 0) return { year: data[i - 1].year };
    if ((a < 0) !== (b < 0)) {
      const t = a / (a - b);
      return { year: data[i - 1].year + t };
    }
  }
  return null;
}

function ChartTooltip({ payload }) {
  if (!payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const leader =
    point.difference >= 0 ? "Renting leads" : "Buying leads";
  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md">
      <Text fw={600} mb={4}>
        Year {point.year}
      </Text>
      <Text size="sm" c="teal">
        Rent + invest: {formatCAD(point.renterNetWorth)}
      </Text>
      <Text size="sm" c="indigo">
        Buy — home equity: {formatCAD(point.ownerNetWorth)}
      </Text>
      <Text size="sm" mt={4}>
        {leader} by {formatCAD(Math.abs(point.difference))}
      </Text>
    </Paper>
  );
}

function SummaryBanner({ data, crossover }) {
  const last = data[data.length - 1];
  const renterWins = last.difference >= 0;
  const margin = formatCAD(Math.abs(last.difference));
  const color = renterWins ? "teal" : "indigo";

  let title, body;
  if (crossover) {
    const breakEvenYear = crossover.year.toFixed(1);
    title = `Break-even around year ${breakEvenYear}`;
    body = renterWins
      ? `Renting leads until then; buying leads from year ${breakEvenYear} onward. At year 30, buying leads by ${margin}.`
      : `Buying leads until then; renting leads from year ${breakEvenYear} onward. At year 30, renting leads by ${margin}.`;
  } else {
    title = renterWins
      ? `Renting leads for the entire 30 years`
      : `Buying leads for the entire 30 years`;
    body = `By ${margin} at year 30.`;
  }

  return (
    <Alert color={color} title={title} radius="md">
      <Text size="sm">{body}</Text>
    </Alert>
  );
}

export default function NetWorthChart({ userInput }) {
  const data = buildData(userInput);
  const crossover = findCrossover(data);

  return (
    <Stack gap="xs">
      <SummaryBanner data={data} crossover={crossover} />
      <Text fw={600} size="lg">
        Net worth: rent vs buy
      </Text>
      <LineChart
        h={400}
        data={data}
        dataKey="year"
        withDots={false}
        curveType="linear"
        valueFormatter={formatCADCompact}
        xAxisLabel="Year"
        tooltipProps={{ content: ChartTooltip }}
        series={[
          { name: "renterNetWorth", label: "Rent + invest", color: "teal.6" },
          {
            name: "ownerNetWorth",
            label: "Buy — home equity",
            color: "indigo.6",
          },
        ]}
        referenceLines={
          crossover
            ? [
                {
                  x: Math.round(crossover.year),
                  label: `Break-even ≈ Yr ${crossover.year.toFixed(1)}`,
                  color: "gray.6",
                },
              ]
            : []
        }
      />
      {!crossover && (
        <Text size="sm" c="dimmed">
          {data[0].difference >= 0
            ? "Renting leads for the entire horizon."
            : "Buying leads for the entire horizon."}
        </Text>
      )}
    </Stack>
  );
}
