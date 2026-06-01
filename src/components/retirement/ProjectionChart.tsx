"use client";

import { Alert, Card, Text } from "@mantine/core";
import {
  Area,
  AreaChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCAD, formatCADCompact } from "@/utils/format";
import type { RetirementResult } from "@/utils/retirement/types";
import { IconInfoCircle } from "@tabler/icons-react";

interface ProjectionChartProps {
  result: RetirementResult;
}

export default function ProjectionChart({ result }: ProjectionChartProps) {
  if (!result.path || result.earliestRetirementAge === null) return null;

  const data = result.path.map((p) => ({
    age: p.age,
    balance: Math.max(0, Math.round(p.balance)),
  }));
  const retireAge = result.earliestRetirementAge;
  const lastAge = data[data.length - 1]?.age ?? retireAge;
  const peak =
    result.portfolioAtRetirement != null
      ? Math.round(result.portfolioAtRetirement)
      : null;

  return (
    <Card withBorder radius="md" padding="md">
      <Text fw={600} mb="lg">
        Projected portfolio (in today&apos;s dollars)
      </Text>
      <Alert
        icon={<IconInfoCircle size={16} />}
        variant="default"
        title="Understanding the projection"
      >
        <Text size="xs">
          The chart shows your projected median net worth based on your
          assumptions. While an aggressive portfolio allocation may increase
          your overall net worth in retirement, it also comes with greater
          return variance, increasing the chance of running out money in
          retirement. Therefore, a higher equity allocation should not
          automatically be interpreted as the better choice for your retirement.
        </Text>
      </Alert>
      <div
        role="img"
        aria-label="Retirement portfolio projection chart"
        style={{ width: "100%", minWidth: 0, height: 360, minHeight: 360 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 32, right: 0, bottom: 32, left: 0 }}
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
              tickMargin={8}
              label={{ value: "Age", position: "bottom", fontSize: 12 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              width={50}
              tickFormatter={(v) => formatCADCompact(Number(v))}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(v) => [formatCAD(Number(v)), "Portfolio"]}
              labelFormatter={(l) => `Age ${l}`}
              contentStyle={{ borderRadius: "8px", padding: "12px" }}
              itemStyle={{ fontSize: "12px" }} // Styles the "Portfolio: $X" text
              labelStyle={{ fontSize: "14px", fontWeight: 600 }} // Styles the "Age X" text
            />
            <ReferenceLine
              x={retireAge}
              stroke="var(--mantine-color-teal-6)"
              strokeDasharray="4 4"
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="var(--mantine-color-teal-6)"
              fill="var(--mantine-color-teal-6)"
              fillOpacity={0.2}
              isAnimationActive={false}
            />
            {peak != null && (
              <ReferenceDot
                x={retireAge}
                y={peak}
                r={4}
                fill="var(--mantine-color-teal-6)"
                stroke="var(--mantine-color-body)"
                strokeWidth={2}
                ifOverflow="visible"
                label={{
                  value: `Retire at ${retireAge} · ${formatCADCompact(peak)}`,
                  position: "left",
                  fill: "var(--mantine-color-teal-7)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
