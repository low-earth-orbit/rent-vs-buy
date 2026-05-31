"use client";

import { Card, Text } from "@mantine/core";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
              label={{
                value: `Retire at ${retireAge}`,
                position: "top",
                fill: "var(--mantine-color-teal-6)",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="var(--mantine-color-teal-6)"
              fill="var(--mantine-color-teal-6)"
              fillOpacity={0.2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
