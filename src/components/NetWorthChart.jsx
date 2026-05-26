import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Group, Paper, Stack, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { calculateNetWorthAtYearEnd } from "../utils/math";
import { formatCAD, formatCADCompact } from "../utils/format";
import { SIMULATION_HORIZON_YEARS } from "../utils/monteCarlo";

const NUM_SIMULATIONS = 3000;

function buildBaseData(userInput) {
  const horizon = SIMULATION_HORIZON_YEARS;
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
      const foundYear = data[i - 1].year + t;

      // Prevent adding multiple crossover points that may occur in the same year due to the Monte Carlo simulations
      if (crossovers.some((c) => c.year === foundYear)) continue;

      crossovers.push({ year: foundYear });
    }
  }
  return crossovers;
}

function ChartTooltip({ payload }) {
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
        {point.renterP25 != null && (
          <Text size="xs" c="dimmed" span>
            {" "}
            ({formatCADCompact(point.renterP25)} –{" "}
            {formatCADCompact(point.renterP75)})
          </Text>
        )}
      </Text>
      <Text size="sm" c="indigo">
        Buy: {formatCAD(owner)}
        {point.ownerP25 != null && (
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

  if (decision.renterWinPct == null) {
    return null;
  }

  const winPct = Math.round(decision.renterWinPct * 100);
  const renterFavored = decision.renterWinPct >= 0.5;
  const winnerPct = renterFavored ? winPct : 100 - winPct;
  const winner = renterFavored ? "Renting" : "Buying";

  let title, color;
  if (winnerPct >= 70) {
    title = `${winner} clearly leads`;
    color = renterFavored ? "teal" : "indigo";
  } else if (winnerPct >= 60) {
    title = `${winner} likely leads`;
    color = renterFavored ? "teal" : "indigo";
  } else {
    title = "Too close to call";
    color = "gray";
  }

  const sims = `${winner} comes out ahead in ${winnerPct}% of simulations at sale (year ${holdingPeriod}).`;

  let body;
  if (winnerPct < 60) {
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

export default function NetWorthChart({ userInput }) {
  const baseData = useMemo(() => buildBaseData(userInput), [userInput]);

  const workerRef = useRef(null);
  const requestIdRef = useRef(0);
  // `mcData` is the result of the Monte Carlo simulations
  const [mcData, setMcData] = useState(null);
  const [debouncedInput] = useDebouncedValue(userInput, 150);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/monteCarloWorker.js", import.meta.url),
    );
    workerRef.current.onmessage = (event) => {
      const { requestId, result } = event.data;
      if (requestId === requestIdRef.current) setMcData(result);
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    requestIdRef.current += 1;
    workerRef.current.postMessage({
      userInput: debouncedInput,
      numSimulations: NUM_SIMULATIONS,
      requestId: requestIdRef.current,
    });
  }, [debouncedInput]);

  const chartData = useMemo(() => {
    if (!mcData) {
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
  }, [baseData, mcData]);

  const crossovers = findCrossovers(chartData, "renterMedian", "ownerMedian");
  const crossoverYears = [
    ...new Set(crossovers.map((c) => Math.round(c.year))),
  ];
  const saleYear = userInput.holdingPeriod;

  const allValues = chartData
    .flatMap((d) => [d.renterP25, d.renterP75, d.ownerP25, d.ownerP75])
    .filter((v) => v != null && isFinite(v));

  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const yPad = (yMax - yMin) * 0.1;
  const yDomain = [
    Math.floor((yMin - yPad) / 50000) * 50000,
    Math.ceil((yMax + yPad) / 50000) * 50000,
  ];

  function crossoverLines() {
    if (crossoverYears.length === 0) return null;
    return crossoverYears.map((year) => (
      <ReferenceLine
        key={`crossover-${year}`}
        x={year}
        stroke="#868e96"
        strokeDasharray="4 4"
        label={{
          value: `Break-even (Yr ${year})`,
          position: "insideTop",
          fontSize: 10,
          fill: "#868e96",
        }}
      />
    ));
  }

  function endLabel(name, fill) {
    return ({ x, y, index, value }) => {
      if (index !== chartData.length - 1) return null;
      if (value == null || !isFinite(x) || !isFinite(y)) return null;
      return (
        <text x={x + 6} y={y} dy={4} fill={fill} fontSize={11} fontWeight={600}>
          {name}
        </text>
      );
    };
  }

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
          margin={{ top: 25, right: 50, left: 0, bottom: 20 }}
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
          <Tooltip content={<ChartTooltip />} />

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

          <Line
            type="linear"
            dataKey="renterMedian"
            name="Rent + Invest"
            stroke="#12b886"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          >
            <LabelList
              dataKey="renterMedian"
              content={endLabel("Rent", "#12b886")}
            />
          </Line>
          <Line
            type="linear"
            dataKey="ownerMedian"
            name="Buy"
            stroke="#4c6ef5"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          >
            <LabelList
              dataKey="ownerMedian"
              content={endLabel("Buy", "#4c6ef5")}
            />
          </Line>
          <ReferenceLine
            x={saleYear}
            stroke="#fd7e14"
            strokeWidth={1.5}
            label={{
              value: `Sale (Yr ${saleYear})`,
              position: "top",
              fontSize: 11,
              fill: "#fd7e14",
              fontWeight: 600,
            }}
          />
          {crossoverLines()}
        </ComposedChart>
      </ResponsiveContainer>
      <Group gap="lg" wrap="wrap">
        <Group gap={6} wrap="nowrap">
          <Box w={18} h={2} style={{ backgroundColor: "#12b886" }} />
          <Text size="xs" c="dimmed">
            <Text span fw={600} c="teal.7">
              Rent + Invest
            </Text>{" "}
            — median
          </Text>
        </Group>
        <Group gap={6} wrap="nowrap">
          <Box w={18} h={2} style={{ backgroundColor: "#4c6ef5" }} />
          <Text size="xs" c="dimmed">
            <Text span fw={600} c="indigo.7">
              Buy
            </Text>{" "}
            — median
          </Text>
        </Group>

        <Group gap={6} wrap="nowrap">
          <Box
            w={18}
            h={10}
            style={{ backgroundColor: "#12b886", opacity: 0.18 }}
          />
          <Text size="xs" c="dimmed">
            Rent 25–75% range
          </Text>
        </Group>
        <Group gap={6} wrap="nowrap">
          <Box
            w={18}
            h={10}
            style={{ backgroundColor: "#4c6ef5", opacity: 0.18 }}
          />
          <Text size="xs" c="dimmed">
            Buy 25–75% range
          </Text>
        </Group>

        <Group gap={6} wrap="nowrap">
          <Box w={18} h={2} style={{ backgroundColor: "#fd7e14" }} />
          <Text size="xs" c="dimmed">
            <Text span fw={600} c="orange.7">
              Sale
            </Text>{" "}
            — year you sell
          </Text>
        </Group>
        {crossoverYears.length > 0 && (
          <Group gap={6} wrap="nowrap">
            <Box w={18} h={0} style={{ borderTop: "2px dashed #868e96" }} />
            <Text size="xs" c="dimmed">
              <Text span fw={600}>
                Break-even
              </Text>{" "}
              — Year{crossoverYears.length > 1 ? "s" : ""} the median rent vs.
              buy paths cross
            </Text>
          </Group>
        )}
      </Group>
      <Text size="xs" c="dimmed">
        Hover over the chart for details at the end of each year.
      </Text>

      <Text size="xs" c="dimmed">
        The chart shows net worth projections for both renting and buying
        scenarios from {NUM_SIMULATIONS.toLocaleString()} Monte Carlo
        simulations. It extends to a 50-year horizon to show what would happen
        if you held longer.
      </Text>

      <Text size="xs" c="dimmed">
        These projections are based on your assumptions and are illustrative
        only — results are subject to modelling error, uncertain inputs, and
        real-world complexity.
      </Text>
    </Stack>
  );
}
