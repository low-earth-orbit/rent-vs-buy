import { Badge, Group, NumberInput, Table, Text, Tooltip } from "@mantine/core";
import { applyAdjustments, type Holding } from "@/utils/acb/parser";
import { formatCAD } from "@/utils/format";

export type T3Adjustments = Record<string, number>;
export type OpeningLots = Record<string, number>;

type HoldingsTableProps = {
  holdings: Holding[];
  t3Adjustments: T3Adjustments;
  onT3Change: (symbol: string, value: number) => void;
  openingLots: OpeningLots;
  onOpeningLotChange: (symbol: string, value: number) => void;
};

const acbFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const sharesFormatter = new Intl.NumberFormat("en-CA", {
  maximumFractionDigits: 4,
});

const HoldingsTable = ({
  holdings,
  t3Adjustments,
  onT3Change,
  openingLots,
  onOpeningLotChange,
}: HoldingsTableProps) => {
  const anyTransferred = holdings.some((h) => h.transferredShares > 0);

  return (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Symbol</Table.Th>
          <Table.Th ta="right">Shares</Table.Th>
          <Table.Th ta="right">ACB/share</Table.Th>
          <Table.Th ta="right">Total cost basis</Table.Th>
          {anyTransferred && <Table.Th>Opening lot ACB ($)</Table.Th>}
          <Table.Th>T3 ROC (box 42)</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {holdings.map((holding) => {
          const t3 = t3Adjustments[holding.symbol] ?? 0;
          const openingLot = openingLots[holding.symbol] ?? 0;
          const adjusted = applyAdjustments(holding, openingLot, t3);
          const hasTransfers = holding.transferredShares > 0;
          return (
            <Table.Tr key={holding.symbol}>
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
                  acbFormatter.format(adjusted.acbPerShare)
                )}
              </Table.Td>
              <Table.Td ta="right">{formatCAD(adjusted.costBasis)}</Table.Td>
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
                <NumberInput
                  aria-label={`T3 ROC (box 42) for ${holding.symbol}`}
                  value={t3 === 0 ? "" : t3}
                  onChange={(value) => onT3Change(holding.symbol, +value || 0)}
                  prefix="$"
                  min={0}
                  step={10}
                  size="xs"
                  w={130}
                  placeholder="$0"
                />
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
};

export default HoldingsTable;
