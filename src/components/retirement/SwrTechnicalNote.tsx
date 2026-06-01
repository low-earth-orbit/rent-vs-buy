"use client";

import { useEffect, useState } from "react";
import {
  Anchor,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { safeWithdrawalRate } from "@/utils/retirement/monteCarlo";
import {
  SWR_TABLE_ALLOCATIONS,
  SWR_TABLE_HORIZONS,
} from "@/utils/retirement/presets";
import type { RetirementInput } from "@/utils/retirement/types";

interface SwrTechnicalNoteProps {
  input: RetirementInput;
}

interface TableRow {
  label: string;
  swrs: number[];
}

/**
 * "Why this figure?" link + modal beside the headline safe withdrawal rate.
 * Explains why the rate is lower than the US "4% rule" and shows a reference
 * table of SWR by stock/bond mix and retirement horizon (computed live at the
 * user's chosen confidence). Pure-portfolio SWR — excludes CPP/OAS/pension.
 */
export default function SwrTechnicalNote({ input }: SwrTechnicalNoteProps) {
  const [opened, { open, close }] = useDisclosure(false);
  // Cache the computed table tagged with the (success, inflation) it was built
  // for; `rows` is null (→ loader) until a result for the current key arrives.
  const [table, setTable] = useState<{ key: string; rows: TableRow[] } | null>(
    null,
  );

  const successPct = input.targetSuccessRate;
  const successRate = successPct / 100;
  const inflation = input.inflationRate;
  const key = `${successRate}|${inflation}`;

  useEffect(() => {
    if (!opened) return;
    const k = `${successRate}|${inflation}`;
    // Defer so the modal paints before the (brief) synchronous MC burst.
    const id = setTimeout(() => {
      setTable({
        key: k,
        rows: SWR_TABLE_ALLOCATIONS.map((a) => ({
          label: a.label,
          swrs: SWR_TABLE_HORIZONS.map((h) =>
            safeWithdrawalRate(
              a.returnPct,
              a.volatility,
              inflation,
              h,
              successRate,
            ),
          ),
        })),
      });
    }, 0);
    return () => clearTimeout(id);
  }, [opened, successRate, inflation]);

  const rows = table && table.key === key ? table.rows : null;

  return (
    <>
      <Anchor component="button" type="button" size="sm" onClick={open}>
        Why this figure?
      </Anchor>

      <Modal
        opened={opened}
        onClose={close}
        title="About the safe withdrawal rate"
        size="lg"
        centered
      >
        <Stack gap="sm">
          <Text size="sm">
            It may look low next to the famous US &ldquo;4% rule.&rdquo; I
            believe it&apos;s right, for two reasons:
          </Text>
          <Text size="sm" component="div">
            <strong>1. Forward-looking Canadian returns.</strong> My return
            assumptions come from PWL Capital&apos;s capital-market estimates
            (corroborated by FP Canada&apos;s planning guidelines) — more modest
            than the 20th-century US history the 4% rule was built on.
          </Text>
          <Text size="sm" component="div">
            <strong>2. Longer retirements need lower rates.</strong> A 30-year
            retirement sustains a higher rate than a 50-year one. The figure
            beside your plan is for <em>your</em> horizon.
          </Text>
          <Text size="sm">
            I checked these rates against 150 years of global market history (16
            countries, 1870–2020): they are in line with — and a touch more
            cautious than — what real history would have sustained. The takeaway
            is that the withdrawal rate is driven by the return assumption, not
            by an overly harsh risk model.
          </Text>

          <Text size="sm" fw={600} mt="xs">
            Safe withdrawal rate by allocation &amp; horizon
            <Text span c="dimmed" fw={400}>
              {" "}
              — {successPct}% success, today&apos;s dollars
            </Text>
          </Text>

          {rows === null ? (
            <Group justify="center" py="lg">
              <Loader size="sm" />
            </Group>
          ) : (
            <Table
              withTableBorder
              withColumnBorders
              striped
              horizontalSpacing="xs"
              verticalSpacing={6}
              fz="xs"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Stocks / Bonds</Table.Th>
                  {SWR_TABLE_HORIZONS.map((h) => (
                    <Table.Th key={h} ta="center">
                      {h}y
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((r) => (
                  <Table.Tr key={r.label}>
                    <Table.Td fw={600}>{r.label}</Table.Td>
                    {r.swrs.map((s, i) => (
                      <Table.Td key={i} ta="center">
                        {(s * 100).toFixed(1)}%
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          <Text size="xs" c="dimmed">
            Each cell is the withdrawal — as a % of the starting portfolio, held
            constant in real terms — with a {successPct}% chance of lasting the
            full horizon. A general benchmark for a globally-diversified mix; it
            excludes CPP/OAS/pension income, so it differs from the blended
            figure shown on your plan.
          </Text>
        </Stack>
      </Modal>
    </>
  );
}
