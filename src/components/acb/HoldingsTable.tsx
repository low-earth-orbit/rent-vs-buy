import { Fragment, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  NumberInput,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import YearlyACBTable from "./YearlyACBTable";
import {
  applyAdjustments,
  computeYearlyACB,
  t3NetAdjustment,
  type AcbTransaction,
  type Holding,
  type T3Slips,
} from "@/utils/acb/parser";
import { formatCADDecimal } from "@/utils/format";

export type OpeningLots = Record<string, number>;

type HoldingsTableProps = {
  holdings: Holding[];
  t3Slips: T3Slips;
  onEditT3: (symbol: string) => void;
  openingLots: OpeningLots;
  onOpeningLotChange: (symbol: string, value: number) => void;
  /**
   * Transactions backing these holdings. When provided, each row gets a
   * chevron that expands an inline year-by-year ACB breakdown.
   */
  transactions?: AcbTransaction[];
};

const sharesFormatter = new Intl.NumberFormat("en-CA", {
  maximumFractionDigits: 4,
});

const HoldingsTable = ({
  holdings,
  t3Slips,
  onEditT3,
  openingLots,
  onOpeningLotChange,
  transactions,
}: HoldingsTableProps) => {
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(
    new Set(),
  );

  // Hide ghost rows: fully sold positions carry no ACB to show.
  const visibleHoldings = holdings.filter((h) => h.shares > 0);
  const anyTransferred = visibleHoldings.some((h) => h.transferredShares > 0);
  const expandable = transactions !== undefined;
  const columnCount = 5 + (anyTransferred ? 1 : 0) + (expandable ? 1 : 0);

  function toggleExpanded(symbol: string) {
    setExpandedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  }

  return (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          {expandable && <Table.Th w={36} aria-label="Year breakdown" />}
          <Table.Th>Symbol</Table.Th>
          <Table.Th ta="right">Shares</Table.Th>
          <Table.Th ta="right">ACB/share</Table.Th>
          <Table.Th ta="right">Total cost basis</Table.Th>
          {anyTransferred && <Table.Th>Opening lot ACB ($)</Table.Th>}
          <Table.Th>T3 slips</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {visibleHoldings.map((holding) => {
          const t3Net = t3NetAdjustment(t3Slips[holding.symbol] ?? []);
          const openingLot = openingLots[holding.symbol] ?? 0;
          const adjusted = applyAdjustments(holding, openingLot, t3Net);
          const hasTransfers = holding.transferredShares > 0;
          const expanded = expandedSymbols.has(holding.symbol);
          return (
            <Fragment key={holding.symbol}>
              <Table.Tr>
                {expandable && (
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      aria-label={`Toggle year-by-year ACB for ${holding.symbol}`}
                      aria-expanded={expanded}
                      onClick={() => toggleExpanded(holding.symbol)}
                    >
                      {expanded ? (
                        <IconChevronDown size={16} />
                      ) : (
                        <IconChevronRight size={16} />
                      )}
                    </ActionIcon>
                  </Table.Td>
                )}
                <Table.Td fw={600}>
                  <Group gap="xs" wrap="nowrap">
                    {holding.symbol}
                    {hasTransfers && (
                      <Tooltip
                        label={`Includes ${sharesFormatter.format(holding.transferredShares)} transferred shares — no purchase history`}
                      >
                        <Badge color="yellow" size="sm" variant="light">
                          {sharesFormatter.format(holding.transferredShares)}{" "}
                          transferred
                        </Badge>
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td ta="right">
                  {sharesFormatter.format(adjusted.shares)}
                </Table.Td>
                <Table.Td ta="right">
                  {adjusted.acbPerShare === null ? (
                    <Text component="span" c="dimmed">
                      —
                    </Text>
                  ) : (
                    formatCADDecimal(adjusted.acbPerShare)
                  )}
                </Table.Td>
                <Table.Td ta="right">
                  {formatCADDecimal(adjusted.costBasis)}
                </Table.Td>
                {anyTransferred && (
                  <Table.Td>
                    {hasTransfers ? (
                      <NumberInput
                        aria-label={`Opening lot ACB for ${holding.symbol}`}
                        value={openingLot === 0 ? "" : openingLot}
                        onChange={(value) =>
                          onOpeningLotChange(holding.symbol, +value || 0)
                        }
                        prefix="$"
                        min={0}
                        step={10}
                        size="xs"
                        w={130}
                        placeholder="$0"
                      />
                    ) : (
                      <Text component="span" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                )}
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => onEditT3(holding.symbol)}
                    >
                      Edit T3
                    </Button>
                    {t3Net !== 0 && (
                      <Badge
                        size="sm"
                        variant="light"
                        color={t3Net > 0 ? "teal" : "red"}
                      >
                        {`${t3Net < 0 ? "−" : "+"}${formatCADDecimal(Math.abs(t3Net))}`}
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
              {expandable && expanded && (
                <Table.Tr>
                  <Table.Td colSpan={columnCount} p="sm">
                    <YearlyACBTable
                      snapshots={computeYearlyACB(transactions, holding.symbol)}
                    />
                  </Table.Td>
                </Table.Tr>
              )}
            </Fragment>
          );
        })}
      </Table.Tbody>
    </Table>
  );
};

export default HoldingsTable;
