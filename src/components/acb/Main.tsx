import { useState } from "react";
import {
  Alert,
  Container,
  List,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import FileUpload from "./FileUpload";
import HoldingsTable, { type OpeningLots } from "./HoldingsTable";
import T3Modal from "./T3Modal";
import {
  computeHoldings,
  computeMarginInterest,
  detectOverlappingFiles,
  hasMixedCurrencies,
  parseFiles,
  type ParsedFile,
  type T3Entry,
  type T3Slips,
} from "@/utils/acb/parser";

const interestFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const Main = () => {
  const [loadedFiles, setLoadedFiles] = useState<ParsedFile[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [t3Slips, setT3Slips] = useState<T3Slips>({});
  const [t3ModalSymbol, setT3ModalSymbol] = useState<string | null>(null);
  const [openingLots, setOpeningLots] = useState<OpeningLots>({});

  async function handleFilesAdded(newFiles: File[]) {
    const { parsed, errors } = await parseFiles(newFiles);
    setParseErrors(errors);
    if (parsed.length > 0) {
      setLoadedFiles((prev) => [...prev, ...parsed]);
    }
  }

  function handleRemoveFile(index: number) {
    setLoadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleEditT3(symbol: string) {
    setT3ModalSymbol(symbol);
  }

  function handleT3EntriesChange(entries: T3Entry[]) {
    if (t3ModalSymbol === null) return;
    const symbol = t3ModalSymbol;
    setT3Slips((prev) => ({ ...prev, [symbol]: entries }));
  }

  function handleOpeningLotChange(symbol: string, value: number) {
    setOpeningLots((prev) => ({ ...prev, [symbol]: value }));
  }

  // Merge all files into one chronologically sorted transaction list.
  const transactions =
    loadedFiles.length > 0
      ? loadedFiles
          .flatMap((file) => file.transactions)
          .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
      : null;
  const holdings = transactions ? computeHoldings(transactions) : null;
  const mixedCurrencies = transactions
    ? hasMixedCurrencies(transactions)
    : false;
  const overlappingFiles = detectOverlappingFiles(
    loadedFiles.map((file) => file.transactions),
  );
  const marginInterest = transactions
    ? computeMarginInterest(transactions)
    : {};
  const marginYears = Object.keys(marginInterest)
    .map(Number)
    .sort((a, b) => a - b);
  const modalEntries =
    t3ModalSymbol !== null ? (t3Slips[t3ModalSymbol] ?? []) : [];

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Paper withBorder p="md" radius="md">
          <FileUpload
            fileNames={loadedFiles.map((file) => file.name)}
            onFilesAdded={handleFilesAdded}
            onRemoveFile={handleRemoveFile}
          />
        </Paper>
        {parseErrors.length > 0 && (
          <Alert color="red" title="Could not read file(s)">
            <List size="sm">
              {parseErrors.map((error) => (
                <List.Item key={error}>{error}</List.Item>
              ))}
            </List>
          </Alert>
        )}
        {overlappingFiles && (
          <Alert color="yellow" title="Overlapping date ranges detected">
            <Text size="sm">
              Overlapping date ranges detected across files — transactions may
              be duplicated. Check that each file covers a distinct date range.
            </Text>
          </Alert>
        )}
        {mixedCurrencies && (
          <Alert color="yellow" title="Mixed currencies detected">
            <Text size="sm">
              This export contains both CAD and USD holdings. ACB calculations
              assume a single currency. USD holdings will need separate ACB
              tracking in CAD using the exchange rate at the time of each
              transaction.
            </Text>
          </Alert>
        )}
        {holdings && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Title order={2} fz="lg">
                Holdings
              </Title>
              <Text c="dimmed" size="sm">
                ACB per share = total cost basis ÷ shares held. Sells reduce
                both shares and the cost basis pool pro-rata (CRA rule), so
                ACB/share stays constant after a sale. Click{" "}
                <strong>Edit T3</strong> to enter capital gains distributions
                (box 21, adds to ACB) and return of capital (box 42, reduces
                ACB) from your T3 slips, per tax year. For holdings with
                transferred-in shares, enter the{" "}
                <strong>opening lot ACB</strong> (total cost basis of the
                transferred shares) so the ACB is complete.
              </Text>
              <HoldingsTable
                holdings={holdings}
                t3Slips={t3Slips}
                onEditT3={handleEditT3}
                openingLots={openingLots}
                onOpeningLotChange={handleOpeningLotChange}
              />
            </Stack>
          </Paper>
        )}
        {marginYears.length > 0 && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Title order={2} fz="lg">
                Margin Interest Paid
              </Title>
              <Text c="dimmed" size="sm">
                Potentially deductible against taxable income (line 22100)
              </Text>
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
          </Paper>
        )}
        <T3Modal
          symbol={t3ModalSymbol}
          entries={modalEntries}
          onChange={handleT3EntriesChange}
          onClose={() => setT3ModalSymbol(null)}
        />
      </Stack>
    </Container>
  );
};

export default Main;
