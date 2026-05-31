"use client";

import { Card, Text } from "@mantine/core";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
      <Text fw={600} mb="xs">
        Projected portfolio (today&apos;s dollars)
      </Text>
      <div
        role="img"
        aria-label="Retirement portfolio projection chart"
        style={{ width: "100%", minWidth: 0, height: 360, minHeight: 360 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 16, right: 16, bottom: 32, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
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
                fontSize: 11,
              }}
            />
            <XAxis
              dataKey="age"
              tickMargin={8}
              label={{ value: "Age", position: "insideBottom", offset: -16 }}
            />
            <YAxis
              width={70}
              tickFormatter={(v) => formatCADCompact(Number(v))}
            />
            <Tooltip
              formatter={(v) => [formatCAD(Number(v)), "Portfolio"]}
              labelFormatter={(l) => `Age ${l}`}
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
                  position: "top",
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
