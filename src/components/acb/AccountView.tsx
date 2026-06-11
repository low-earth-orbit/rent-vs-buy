import { Paper, Stack, Table, Title } from "@mantine/core";
import HoldingsTable, { type OpeningLots } from "./HoldingsTable";
import {
  computeHoldings,
  computeMarginInterest,
  type AccountGroup,
  type T3Slips,
} from "@/utils/acb/parser";

const interestFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type AccountSectionProps = {
  group: AccountGroup;
  t3Slips: T3Slips;
  onEditT3: (symbol: string) => void;
  openingLots: OpeningLots;
  onOpeningLotChange: (symbol: string, value: number) => void;
};

const AccountSection = ({
  group,
  t3Slips,
  onEditT3,
  openingLots,
  onOpeningLotChange,
}: AccountSectionProps) => {
  const header =
    [group.accountType, group.accountId].filter(Boolean).join(" · ") ||
    "Unknown account";

  if (group.isRegistered) {
    return null;
  }

  const holdings = computeHoldings(group.transactions);
  const marginInterest = computeMarginInterest(group.transactions);
  const marginYears = Object.keys(marginInterest)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Title order={3} fz="lg">
          {header}
        </Title>
        <HoldingsTable
          holdings={holdings}
          t3Slips={t3Slips}
          onEditT3={onEditT3}
          openingLots={openingLots}
          onOpeningLotChange={onOpeningLotChange}
          transactions={group.transactions}
        />
        {marginYears.length > 0 && (
          <Stack gap="xs">
            <Title order={4} fz="md">
              Margin Interest Paid
            </Title>
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Tax Year</Table.Th>
                  <Table.Th ta="right">Interest Paid</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {marginYears.map((year) => (
                  <Table.Tr key={year}>
                    <Table.Td>{year}</Table.Td>
                    <Table.Td ta="right">
                      {interestFormatter.format(marginInterest[year])}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

type AccountViewProps = {
  groups: AccountGroup[];
  t3Slips: T3Slips;
  onEditT3: (symbol: string) => void;
  openingLots: OpeningLots;
  onOpeningLotChange: (symbol: string, value: number) => void;
};

/**
 * By-account breakdown: one section per non-registered (accountId, accountType) group.
 * Registered accounts (TFSA / RRSP / FHSA) are filtered out and not shown.
 * Each account gets its own holdings table with expandable year-by-year ACB rows
 * and (for margin accounts) a margin interest summary.
 * T3 slips and opening lots apply globally by symbol.
 */
const AccountView = ({
  groups,
  t3Slips,
  onEditT3,
  openingLots,
  onOpeningLotChange,
}: AccountViewProps) => (
  <Stack gap="lg">
    {groups.map((group) => (
      <AccountSection
        key={`${group.accountId}|${group.accountType}`}
        group={group}
        t3Slips={t3Slips}
        onEditT3={onEditT3}
        openingLots={openingLots}
        onOpeningLotChange={onOpeningLotChange}
      />
    ))}
  </Stack>
);

export default AccountView;
