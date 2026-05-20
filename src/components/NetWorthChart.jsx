import { useMemo } from "react";
import { Alert, Paper, Stack, Text } from "@mantine/core";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { calculateNetWorthAtYearEnd } from "../utils/math";
import { runMonteCarlo } from "../utils/monteCarlo";
import { formatCAD, formatCADCompact } from "../utils/format";

function buildBaseData(userInput) {
  return Array.from({ length: 30 }, (_, i) =>
    calculateNetWorthAtYearEnd({ ...userInput, yearNumber: i + 1 }),
  );
}

function findCrossovers(data, renterKey, ownerKey) {
  const crossovers = [];
  for (let i = 1; i < data.length; i++) {
    const a = data[i - 1][renterKey] - data[i - 1][ownerKey];
    const b = data[i][renterKey] - data[i][ownerKey];
    if (a === 0) {
      crossovers.push({ year: data[i - 1].year });
      continue;
    }
    if (a < 0 !== b < 0) {
      const t = a / (a - b);
      crossovers.push({ year: data[i - 1].year + t });
    }
  }
  return crossovers;
}

function ChartTooltip({ payload, showBands }) {
  if (!payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const renter = point.renterMedian;
  const owner = point.ownerMedian;
  if (renter == null || owner == null) return null;
  const leader = renter >= owner ? "Renting leads" : "Buying leads";

  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md">
      <Text fw={600} mb={4}>
        Year {point.year}
      </Text>
      <Text size="sm" c="teal">
        Rent + Invest: {formatCAD(renter)}
        {showBands && point.renterP25 != null && (
          <Text size="xs" c="dimmed" span>
            {" "}
            ({formatCADCompact(point.renterP25)} –{" "}
            {formatCADCompact(point.renterP75)})
          </Text>
        )}
      </Text>
      <Text size="sm" c="indigo">
        Buy: {formatCAD(owner)}
        {showBands && point.ownerP25 != null && (
          <Text size="xs" c="dimmed" span>
            {" "}
            ({formatCADCompact(point.ownerP25)} –{" "}
            {formatCADCompact(point.ownerP75)})
          </Text>
        )}
      </Text>
      <Text size="sm" mt={4}>
        {leader} by {formatCAD(Math.abs(renter - owner))}
      </Text>
    </Paper>
  );
}

function Summary({ data, crossovers }) {
  const last = data[data.length - 1];
  const renterWins = last.renterMedian >= last.ownerMedian;
  const color =
    crossovers.length >= 2 ? "gray" : renterWins ? "teal" : "indigo";

  let title, body;
  if (crossovers.length === 0) {
    title = renterWins ? "Renting leads" : "Buying leads";
    body = "For the entire 30 years.";
  } else if (crossovers.length === 1) {
    const breakEvenYear = crossovers[0].year.toFixed(0);
    title = `Break-even around year ${breakEvenYear}`;
    body = renterWins
      ? `Buying leads until then; renting leads from year ${breakEvenYear} onward.`
      : `Renting leads until then; buying leads from year ${breakEvenYear} onward.`;
  } else {
    const lastCrossYear = crossovers[crossovers.length - 1].year.toFixed(0);
    title = `Lead changes ${crossovers.length} times`;
    body = `The two paths cross ${crossovers.length} times over 30 years — the outcome depends heavily on your time horizon. ${renterWins ? "Renting" : "Buying"} leads from year ${lastCrossYear} onward.`;
  }

  return (
    <Alert color={color} title={title} radius="md">
      <Text size="sm">{body}</Text>
    </Alert>
  );
}

export default function NetWorthChart({ userInput, showBands }) {
  const baseData = useMemo(() => buildBaseData(userInput), [userInput]);

  const mcData = useMemo(
    () => (showBands ? runMonteCarlo(userInput) : null),
    [userInput, showBands],
  );

  const chartData = useMemo(() => {
    if (!showBands || !mcData) {
      return baseData.map((d) => ({
        year: d.year,
        renterMedian: d.renterNetWorth,
        ownerMedian: d.ownerNetWorth,
      }));
    }
    return mcData.map((mc) => ({
      year: mc.year,
      renterP25: mc.renterP25,
      renterMedian: mc.renterMedian,
      renterP75: mc.renterP75,
      renterBandBase: mc.renterP25,
      renterBandWidth: mc.renterP75 - mc.renterP25,
      ownerP25: mc.ownerP25,
      ownerMedian: mc.ownerMedian,
      ownerP75: mc.ownerP75,
      ownerBandBase: mc.ownerP25,
      ownerBandWidth: mc.ownerP75 - mc.ownerP25,
    }));
  }, [baseData, mcData, showBands]);

  const crossovers = findCrossovers(chartData, "renterMedian", "ownerMedian");

  const allValues = chartData
    .flatMap((d) =>
      showBands
        ? [d.renterP25, d.renterP75, d.ownerP25, d.ownerP75]
        : [d.renterMedian, d.ownerMedian],
    )
    .filter((v) => v != null && isFinite(v));

  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const yPad = (yMax - yMin) * 0.08;
  const yDomain = [
    Math.floor((yMin - yPad) / 50000) * 50000,
    Math.ceil((yMax + yPad) / 50000) * 50000,
  ];

  return (
    <Stack gap="xs">
      <Summary data={chartData} crossovers={crossovers} />
      <Text fw={600} size="lg">
        Net worth: rent vs buy
      </Text>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 10, bottom: 20 }}
        >
          <XAxis
            dataKey="year"
            label={{ value: "Year", position: "insideBottom", offset: -10 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={formatCADCompact}
            tick={{ fontSize: 12 }}
            width={70}
          />
          <Tooltip content={<ChartTooltip showBands={showBands} />} />

          {showBands && (
            <>
              <Area
                type="linear"
                dataKey="renterBandBase"
                stackId="renter"
                fill="transparent"
                stroke="none"
                legendType="none"
                name=""
              />
              <Area
                type="linear"
                dataKey="renterBandWidth"
                stackId="renter"
                fill="#12b886"
                fillOpacity={0.18}
                stroke="none"
                legendType="none"
                name=""
              />
              <Area
                type="linear"
                dataKey="ownerBandBase"
                stackId="owner"
                fill="transparent"
                stroke="none"
                legendType="none"
                name=""
              />
              <Area
                type="linear"
                dataKey="ownerBandWidth"
                stackId="owner"
                fill="#4c6ef5"
                fillOpacity={0.18}
                stroke="none"
                legendType="none"
                name=""
              />
            </>
          )}

          <Line
            type="linear"
            dataKey="renterMedian"
            name="Rent + Invest"
            stroke="#12b886"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="linear"
            dataKey="ownerMedian"
            name="Buy"
            stroke="#4c6ef5"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />

          {crossovers.map((c, i) => (
            <ReferenceLine
              key={i}
              x={Math.round(c.year)}
              stroke="#868e96"
              strokeDasharray="4 4"
              label={{
                value:
                  crossovers.length === 1
                    ? `Break-even ≈ Yr ${c.year.toFixed(0)}`
                    : `Yr ${c.year.toFixed(0)}`,
                position: "top",
                fontSize: 11,
                fill: "#868e96",
              }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </Stack>
  );
}
