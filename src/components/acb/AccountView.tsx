import { useState } from "react";
import {
  Alert,
  Anchor,
  Collapse,
  Paper,
  Stack,
  Table,
  Title,
} from "@mantine/core";
import HoldingsTable, { type OpeningLots } from "./HoldingsTable";
import YearlyACBTable from "./YearlyACBTable";
import {
  computeHoldings,
  computeMarginInterest,
  computeYearlyACB,
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
  const [yearsExpanded, setYearsExpanded] = useState(false);
  const header =
    [group.accountType, group.accountId].filter(Boolean).join(" · ") ||
    "Unknown account";

  if (group.isRegistered) {
    return (
      <Paper withBorder p="md" radius="md">
        <Stack gap="sm">
          <Title order={3} fz="lg">
            {header}
          </Title>
          <Alert color="blue" title="Registered account">
            ACB does not apply to registered accounts (TFSA / RRSP / FHSA) —
            no holdings shown.
          </Alert>
        </Stack>
      </Paper>
    );
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
        />
        {holdings.length > 0 && (
          <Stack gap={4}>
            <Anchor
              component="button"
              type="button"
              size="sm"
              onClick={() => setYearsExpanded((open) => !open)}
              aria-expanded={yearsExpanded}
            >
              {yearsExpanded ? "Hide year-by-year ACB" : "Year-by-year ACB"}
            </Anchor>
            <Collapse expanded={yearsExpanded}>
              <Stack gap="xs">
                {holdings.map((holding) => (
                  <YearlyACBTable
                    key={holding.symbol}
                    symbol={holding.symbol}
                    snapshots={computeYearlyACB(
                      group.transactions,
                      holding.symbol,
                    )}
                  />
                ))}
              </Stack>
            </Collapse>
          </Stack>
        )}
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
 * By-account breakdown: one section per (accountId, accountType) group.
 * Registered accounts (TFSA / RRSP / FHSA) show a notice instead of holdings;
 * non-registered accounts get their own holdings table, a collapsible
 * year-by-year ACB breakdown per symbol, and (for margin accounts) a margin
 * interest summary. T3 slips and opening lots apply globally by symbol.
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
