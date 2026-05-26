import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Collapse,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  VisuallyHidden,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconDownload,
} from "@tabler/icons-react";
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
import { formatCAD, formatCADCompact } from "../utils/format";

const NUM_SIMULATIONS = 1000;

const INPUT_LABELS = {
  monthlyRent: "Monthly Rent ($)",
  initialHomePrice: "Home Price ($)",
  downPaymentPercentage: "Down Payment (%)",
  annualMortgageInterestRate: "Mortgage Rate (%/yr)",
  amortizationPeriod: "Amortization (years)",
  holdingPeriod: "Holding Period (years)",
  rentIncreaseRate: "Rent Increase Rate (%/yr)",
  homePriceGrowthRate: "Home Price Growth (%/yr)",
  ownerCostGrowthRate: "Owner Cost Growth (%/yr)",
  investmentReturnRate: "Investment Return (%/yr)",
  dividendYield: "Dividend Yield (%)",
  dividendTaxRate: "Dividend Tax Rate (%)",
  capitalGainTaxRate: "Capital Gain Tax Rate (%)",
  propertyTaxRate: "Property Tax Rate (%)",
  maintPct: "Maintenance (%/yr)",
  condoFeesPerMonth: "Condo Fees ($/month)",
  buyerClosingCostsPct: "Buyer Closing Costs (%)",
  sellerClosingCostsPct: "Seller Closing Costs (%)",
  homePriceGrowthSigma: "Home Price Growth Sigma",
  investmentReturnSigma: "Investment Return Sigma",
  rentIncreaseSigma: "Rent Increase Sigma",
  ownerCostGrowthSigma: "Owner Cost Growth Sigma",
  mortgageRateSigma: "Mortgage Rate Sigma",
  dividendYieldSigma: "Dividend Yield Sigma",
};

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

function Summary({ data, holdingPeriod }) {
  const decision =
    data.find((d) => d.year === holdingPeriod) ?? data[data.length - 1];

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
  } else {
    body = sims;
  }

  return (
    <Alert color={color} title={title} radius="md">
      <Text size="sm">{body}</Text>
    </Alert>
  );
}

export default function NetWorthChart({ userInput }) {
  const workerRef = useRef(null);
  const requestIdRef = useRef(0);
  const [mcData, setMcData] = useState(null);
  const [debouncedInput] = useDebouncedValue(userInput, 150);
  const [tableOpen, setTableOpen] = useState(false);

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
    if (!mcData) return null;
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
  }, [mcData]);

  // Early return if chartData isn't ready yet.
  if (!chartData) return null;

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

  function downloadCSV() {
    const esc = (v) => {
      if (v == null) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = [
      ["Input", "Value"],
      ...Object.entries(INPUT_LABELS)
        .filter(([key]) => userInput[key] !== undefined)
        .map(([key, label]) => [label, userInput[key]]),
      [],
      [
        "Year",
        "Rent+Invest Median",
        "Rent P25",
        "Rent P75",
        "Buy Median",
        "Buy P25",
        "Buy P75",
        "Renter Win %",
      ],
      ...chartData.map((d) => [
        d.year,
        Math.round(d.renterMedian ?? 0),
        Math.round(d.renterP25 ?? 0),
        Math.round(d.renterP75 ?? 0),
        Math.round(d.ownerMedian ?? 0),
        Math.round(d.ownerP25 ?? 0),
        Math.round(d.ownerP75 ?? 0),
        d.renterWinPct != null ? `${Math.round(d.renterWinPct * 100)}%` : "",
      ]),
    ];
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rent-vs-buy.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Stack gap="xs">
      <Summary data={chartData} holdingPeriod={userInput.holdingPeriod} />
      <div
        role="img"
        aria-label={`Net worth projection chart comparing renting versus buying over 50 years using ${NUM_SIMULATIONS.toLocaleString()} Monte Carlo simulations. The data table below provides the same information in accessible text form.`}
      >
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
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      <Group gap="lg" wrap="wrap" aria-label="Chart legend">
        <Group gap={6} wrap="nowrap">
          <Box w={18} h={2} style={{ backgroundColor: "#12b886" }} aria-hidden="true" />
          <Text size="xs" c="dimmed">
            <Text span fw={600} c="teal.7">
              Rent + Invest
            </Text>{" "}
            — median
          </Text>
        </Group>
        <Group gap={6} wrap="nowrap">
          <Box w={18} h={2} style={{ backgroundColor: "#4c6ef5" }} aria-hidden="true" />
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
            aria-hidden="true"
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
            aria-hidden="true"
          />
          <Text size="xs" c="dimmed">
            Buy 25–75% range
          </Text>
        </Group>

        <Group gap={6} wrap="nowrap">
          <Box w={18} h={2} style={{ backgroundColor: "#fd7e14" }} aria-hidden="true" />
          <Text size="xs" c="dimmed">
            <Text span fw={600} c="orange.7">
              Sale
            </Text>{" "}
            — year you sell
          </Text>
        </Group>
      </Group>

      <Text size="xs" c="dimmed">
        The chart shows net worth projections for both renting and buying
        scenarios from {NUM_SIMULATIONS.toLocaleString()} Monte Carlo
        simulations. It extends to a 50-year horizon to show what would happen
        if you held longer. These projections are based on your assumptions and
        are illustrative only — results are subject to modelling error,
        uncertain inputs, and real-world complexity.
      </Text>

      <Group justify="space-between" align="center" mt="xs">
        <Button
          variant="subtle"
          size="xs"
          color="gray"
          aria-expanded={tableOpen}
          aria-controls="net-worth-data-table"
          leftSection={
            tableOpen ? (
              <IconChevronUp size={14} aria-hidden="true" />
            ) : (
              <IconChevronDown size={14} aria-hidden="true" />
            )
          }
          onClick={() => setTableOpen((o) => !o)}
        >
          {tableOpen ? "Hide" : "Show"} data table
        </Button>
        <Button
          variant="subtle"
          size="xs"
          color="gray"
          leftSection={<IconDownload size={14} aria-hidden="true" />}
          onClick={downloadCSV}
        >
          Download CSV
        </Button>
      </Group>

      <Collapse in={tableOpen}>
        <div id="net-worth-data-table">
          <ScrollArea>
            <Table
              striped
              withTableBorder
              withColumnBorders
              fz="xs"
              style={{ minWidth: 620 }}
            >
              <caption style={{ captionSide: "top", textAlign: "left", fontSize: "0.75rem", color: "var(--mantine-color-dimmed)", paddingBottom: 4 }}>
                Year-by-year net worth comparison: Renting vs Buying ({NUM_SIMULATIONS.toLocaleString()} Monte Carlo simulations)
              </caption>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th scope="col">Year</Table.Th>
                  <Table.Th scope="col" c="teal.9">Rent+Invest (median)</Table.Th>
                  <Table.Th scope="col" c="teal.9"><abbr title="25th percentile">P25</abbr> — Rent</Table.Th>
                  <Table.Th scope="col" c="teal.9"><abbr title="75th percentile">P75</abbr> — Rent</Table.Th>
                  <Table.Th scope="col" c="indigo.7">Buy (median)</Table.Th>
                  <Table.Th scope="col" c="indigo.7"><abbr title="25th percentile">P25</abbr> — Buy</Table.Th>
                  <Table.Th scope="col" c="indigo.7"><abbr title="75th percentile">P75</abbr> — Buy</Table.Th>
                  <Table.Th scope="col">
                    Renter wins
                    <VisuallyHidden> (% of simulations)</VisuallyHidden>
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {chartData.map((d) => (
                  <Table.Tr
                    key={d.year}
                    style={
                      d.year === userInput.holdingPeriod
                        ? { fontWeight: 700 }
                        : undefined
                    }
                  >
                    <Table.Td>
                      {d.year}
                      {d.year === userInput.holdingPeriod && (
                        <>
                          {" "}<span aria-hidden="true">★</span>
                          <VisuallyHidden> (sale year)</VisuallyHidden>
                        </>
                      )}
                    </Table.Td>
                    <Table.Td>{formatCADCompact(d.renterMedian)}</Table.Td>
                    <Table.Td c="dimmed">{formatCADCompact(d.renterP25)}</Table.Td>
                    <Table.Td c="dimmed">{formatCADCompact(d.renterP75)}</Table.Td>
                    <Table.Td>{formatCADCompact(d.ownerMedian)}</Table.Td>
                    <Table.Td c="dimmed">{formatCADCompact(d.ownerP25)}</Table.Td>
                    <Table.Td c="dimmed">{formatCADCompact(d.ownerP75)}</Table.Td>
                    <Table.Td>
                      {d.renterWinPct != null
                        ? `${Math.round(d.renterWinPct * 100)}%`
                        : "—"}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <Text size="xs" c="dimmed" mt={4}>
            <span aria-hidden="true">★</span> Sale year (holding period)
          </Text>
        </div>
      </Collapse>
    </Stack>
  );
}
