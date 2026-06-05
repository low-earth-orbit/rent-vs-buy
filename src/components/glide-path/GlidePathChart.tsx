"use client";

import { Box, Card, Group, Paper, Text } from "@mantine/core";
import {
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GlidePathInput, GlidePathResult } from "@/utils/glide-path/types";
import { generateTicks } from "@/utils/charts";

const TEAL = "var(--mantine-color-teal-6)";
const INDIGO = "var(--mantine-color-indigo-5)";

interface ChartPoint {
  age: number;
  equity: number;
  phase: "accum" | "retire";
}

function ChartTooltip({ payload }: { payload?: { payload: ChartPoint }[] }) {
  if (!payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md">
      <Text fw={600} mb={2}>
        Age {p.age}
      </Text>
      <Text size="sm" c="teal">
        Equity {p.equity.toFixed(0)}%
      </Text>
      <Text size="xs" c="dimmed">
        {p.phase === "accum" ? "Accumulation" : "Retirement"}
      </Text>
    </Paper>
  );
}

export default function GlidePathChart({
  input,
  result,
  showConstant = true,
}: {
  input: GlidePathInput;
  result: GlidePathResult;
  /** Hide the constant-equity reference line when that constant is itself degenerate. */
  showConstant?: boolean;
}) {
  const retireAge = input.startAge + result.params.accumYears;
  const data: ChartPoint[] = result.equityByYear.map((w, i) => {
    const age = input.startAge + i;
    return {
      age,
      equity: Math.round(w * 1000) / 10,
      phase: age < retireAge ? "accum" : "retire",
    };
  });
  const lastAge = data.length ? data[data.length - 1].age : retireAge;
  const levCap = result.params.maxLeverage * 100;
  const yMax = Math.max(105, Math.ceil((levCap + 5) / 10) * 10);

  // With no estate goal the optimizer derisks the final block (a fixed-horizon
  // artifact, not advice). Detect a notable drop in the last retirement step to footnote it.
  const lastBlock = result.schedule.at(-1);
  const prevBlock = result.schedule.at(-2);
  const terminalDerisk =
    result.params.bequestWeight === 0 &&
    lastBlock != null &&
    prevBlock != null &&
    lastBlock.phase === "retire" &&
    prevBlock.equityPct - lastBlock.equityPct >= 15;

  const ageTicks = generateTicks(input.startAge, input.planningAge, 5);
  const equityTicks = generateTicks(0, yMax, 10);

  return (
    <Card withBorder radius="md" padding="md">
      <Text fw={600} mb="md">
        Optimal equity allocation by age
      </Text>
      <div
        role="img"
        aria-label="Optimal equity weight by age"
        style={{ width: "100%", minWidth: 0 }}
      >
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 12, bottom: 28, left: 0 }}
          >
            <ReferenceArea
              x1={retireAge}
              x2={lastAge}
              fill="var(--mantine-color-gray-5)"
              fillOpacity={0.1}
              ifOverflow="visible"
              label={{
                value: "Retirement",
                position: "insideTopRight",
                fill: "var(--mantine-color-gray-6)",
                fontSize: 12,
              }}
            />
            <XAxis
              dataKey="age"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={ageTicks}
              tickMargin={8}
              label={{ value: "Age", position: "bottom", fontSize: 12 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              width={44}
              domain={[0, yMax]}
              ticks={equityTicks}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<ChartTooltip />} />
            {levCap > 100 && (
              <ReferenceLine
                y={100}
                stroke="var(--mantine-color-gray-5)"
                strokeDasharray="2 3"
                label={{
                  value: "100% (unleveraged)",
                  position: "insideBottomRight",
                  fill: "var(--mantine-color-gray-6)",
                  fontSize: 10,
                }}
              />
            )}
            <ReferenceLine x={retireAge} stroke={TEAL} strokeDasharray="4 4" />
            {showConstant && (
              <ReferenceLine
                y={result.flatEquityPct}
                stroke={INDIGO}
                strokeWidth={2}
                strokeDasharray="5 4"
                label={{
                  value: `Constant ${result.flatEquityPct.toFixed(0)}%`,
                  position: "insideTopLeft",
                  fill: "var(--mantine-color-indigo-6)",
                  fontSize: 11,
                }}
              />
            )}
            <Line
              type="stepAfter"
              dataKey="equity"
              stroke={TEAL}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Group gap="lg" mt="sm" wrap="wrap">
        <Group gap={6} wrap="nowrap">
          <Box w={18} h={2} style={{ backgroundColor: TEAL }} aria-hidden />
          <Text size="xs" c="dimmed">
            Optimized glide path
          </Text>
        </Group>
        {showConstant && (
          <Group gap={6} wrap="nowrap">
            <Box
              w={18}
              h={0}
              style={{ borderTop: `2px dashed ${INDIGO}` }}
              aria-hidden
            />
            <Text size="xs" c="dimmed">
              Best constant {result.flatEquityPct.toFixed(0)}% equity
            </Text>
          </Group>
        )}
        <Text size="xs" c="dimmed">
          Vertical line marks retirement. Equity is held flat within each{" "}
          {result.params.interval}-year step.
        </Text>
      </Group>
      {terminalDerisk && (
        <Text size="xs" c="dimmed" mt="xs">
          <Text span fw={600}>
            Note:
          </Text>{" "}
          the dip in the final years is a fixed-horizon artifact, not advice.
          With no estate goal, holding stocks in the last years only adds risk
          with no upside (you can&apos;t spend a final-year windfall and leave
          nothing behind), so the optimizer derisks. Set an estate goal to
          remove it.
        </Text>
      )}
    </Card>
  );
}
