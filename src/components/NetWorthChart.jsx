import { useMemo } from "react";
import { Alert, Box, Group, Paper, Stack, Text } from "@mantine/core";
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
  const horizon = Math.max(
    userInput.amortizationPeriod,
    userInput.holdingPeriod ?? 0,
  );
  return Array.from({ length: horizon }, (_, i) =>
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

function Summary({ data, crossovers, holdingPeriod }) {
  const decision =
    data.find((d) => d.year === holdingPeriod) ?? data[data.length - 1];
  const priorCrossovers = crossovers.filter((c) => c.year <= holdingPeriod);

  // Median-based fallback when MC data is unavailable.
  if (decision.renterWinPct == null) {
    const renterWins = decision.renterMedian >= decision.ownerMedian;
    const color = renterWins ? "teal" : "indigo";
    return (
      <Alert
        color={color}
        title={renterWins ? "Renting leads" : "Buying leads"}
        radius="md"
      >
        <Text size="sm">At sale (year {holdingPeriod}).</Text>
      </Alert>
    );
  }

  const winPct = Math.round(decision.renterWinPct * 100);
  const renterFavored = decision.renterWinPct >= 0.5;
  const winnerPct = renterFavored ? winPct : 100 - winPct;
  const winner = renterFavored ? "Renting" : "Buying";

  let title, color;
  if (winnerPct >= 80) {
    title = `${winner} clearly leads`;
    color = renterFavored ? "teal" : "indigo";
  } else if (winnerPct >= 65) {
    title = `${winner} likely leads`;
    color = renterFavored ? "teal" : "indigo";
  } else {
    title = "Too close to call";
    color = "gray";
  }

  const sims = `${winner} comes out ahead in ${winnerPct}% of simulations at sale (year ${holdingPeriod}).`;

  let body;
  if (winnerPct < 65) {
    body = `${sims} Small changes in your assumptions could flip the outcome.`;
  } else if (priorCrossovers.length === 0) {
    body = sims;
  } else if (priorCrossovers.length === 1) {
    body = `${sims} Median paths cross around year ${priorCrossovers[0].year.toFixed(0)}.`;
  } else {
    body = `${sims} Median paths cross ${priorCrossovers.length} times before sale — outcome depends on your time horizon.`;
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
      renterWinPct: mc.renterWinPct,
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
      <Summary
        data={chartData}
        crossovers={crossovers}
        holdingPeriod={userInput.holdingPeriod}
      />
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={chartData}
          margin={{ top: 25, right: 10, left: 10, bottom: 20 }}
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

          {crossovers.map((c, i) => {
            const x = Math.round(c.year);
            const lineTop = yDomain[0] + (yDomain[1] - yDomain[0]) * 0.9;
            const labelPrefix = crossovers.length === 1 ? "Break-even Yr " : "";
            return (
              <ReferenceLine
                key={i}
                segment={[
                  { x, y: yDomain[0] },
                  { x, y: lineTop },
                ]}
                stroke="#868e96"
                strokeDasharray="4 4"
                label={{
                  value: `${labelPrefix}${x}`,
                  position: "top",
                  fontSize: 11,
                  fill: "#868e96",
                }}
              />
            );
          })}

          <ReferenceLine
            x={userInput.holdingPeriod}
            stroke="#fd7e14"
            strokeWidth={1.5}
            label={{
              value: `Sale (Yr ${userInput.holdingPeriod})`,
              position: "top",
              fontSize: 11,
              fill: "#fd7e14",
              fontWeight: 600,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <Group gap="lg" wrap="wrap">
        <Group gap={6} wrap="nowrap">
          <Box w={18} h={2} style={{ backgroundColor: "#fd7e14" }} />
          <Text size="xs" c="dimmed">
            <Text span fw={600} c="orange.7">
              Sale
            </Text>{" "}
            — year you sell (your holding period). Win % is decided here.
          </Text>
        </Group>
        {crossovers.length > 0 && (
          <Group gap={6} wrap="nowrap">
            <Box w={18} h={0} style={{ borderTop: "2px dashed #868e96" }} />
            <Text size="xs" c="dimmed">
              <Text span fw={600}>
                Break-even
              </Text>{" "}
              — year the median rent vs. buy paths cross.
            </Text>
          </Group>
        )}
      </Group>
      {showBands && (
        <Text size="xs" c="dimmed">
          Shaded bands show 25th–75th percentile from 1,000 Monte Carlo
          simulations. The chart extends past the sale year to show what would
          happen if you held longer.
        </Text>
      )}
      <Text size="xs" c="dimmed">
        These projections are based on your assumptions and are illustrative
        only — results are subject to modelling error, uncertain inputs, and
        real-world complexity. This is not financial advice.
      </Text>
    </Stack>
  );
}
