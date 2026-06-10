import {
  Badge,
  Button,
  Group,
  NumberInput,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  applyAdjustments,
  t3NetAdjustment,
  type Holding,
  type T3Slips,
} from "@/utils/acb/parser";
import { formatCAD } from "@/utils/format";

export type OpeningLots = Record<string, number>;

type HoldingsTableProps = {
  holdings: Holding[];
  t3Slips: T3Slips;
  onEditT3: (symbol: string) => void;
  openingLots: OpeningLots;
  onOpeningLotChange: (symbol: string, value: number) => void;
};

const currencyFormatter = new Intl.NumberFormat("en-CA", {
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
  t3Slips,
  onEditT3,
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
          <Table.Th>T3 slips</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {holdings.map((holding) => {
          const t3Net = t3NetAdjustment(t3Slips[holding.symbol] ?? []);
          const openingLot = openingLots[holding.symbol] ?? 0;
          const adjusted = applyAdjustments(holding, openingLot, t3Net);
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
                  currencyFormatter.format(adjusted.acbPerShare)
                )}
              </Table.Td>
              <Table.Td ta="right">
                {currencyFormatter.format(adjusted.costBasis)}
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
                      {`${t3Net < 0 ? "−" : "+"}${formatCAD(Math.abs(t3Net))}`}
                    </Badge>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
};

export default HoldingsTable;
