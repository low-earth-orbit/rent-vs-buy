import { useState } from "react";
import {
  Alert,
  Container,
  List,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import AccountView from "./AccountView";
import FilePreviewModal from "./FilePreviewModal";
import FileUpload from "./FileUpload";
import HoldingsTable, { type OpeningLots } from "./HoldingsTable";
import T3Modal from "./T3Modal";
import YearlyACBTable from "./YearlyACBTable";
import {
  computeHoldings,
  computeMarginInterest,
  computeYearlyACB,
  detectOverlappingFiles,
  groupByAccount,
  hasMixedCurrencies,
  parseFiles,
  type AcbTransaction,
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

const sharesFormatter = new Intl.NumberFormat("en-CA", {
  maximumFractionDigits: 4,
});

/** True when the transaction belongs to a registered account (TFSA/RRSP/FHSA). */
function isRegisteredTransaction(tx: AcbTransaction): boolean {
  return /tfsa|rrsp|fhsa/i.test(tx.accountType ?? "");
}

type ViewMode = "combined" | "byAccount" | "byYear";

function isViewMode(value: string): value is ViewMode {
  return value === "combined" || value === "byAccount" || value === "byYear";
}

const Main = () => {
  const [loadedFiles, setLoadedFiles] = useState<ParsedFile[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [t3Slips, setT3Slips] = useState<T3Slips>({});
  const [t3ModalSymbol, setT3ModalSymbol] = useState<string | null>(null);
  const [openingLots, setOpeningLots] = useState<OpeningLots>({});
  const [previewFileIndex, setPreviewFileIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("combined");

  async function handleFilesAdded(newFiles: File[]) {
    const { parsed, errors } = await parseFiles(newFiles);
    setParseErrors(errors);
    if (parsed.length > 0) {
      setLoadedFiles((prev) => [...prev, ...parsed]);
    }
  }

  function handleRemoveFile(index: number) {
    setLoadedFiles((prev) => prev.filter((_, i) => i !== index));
    // Keep the preview pointing at the same file (or close it if removed).
    setPreviewFileIndex((prev) => {
      if (prev === null || prev < index) return prev;
      if (prev === index) return null;
      return prev - 1;
    });
  }

  function handleUpdateTransaction(
    fileIndex: number,
    rowIndex: number,
    patch: Partial<AcbTransaction>,
  ) {
    // Holdings, overlap detection, and margin interest are all derived from
    // loadedFiles below, so they recompute automatically on this update.
    setLoadedFiles((prev) =>
      prev.map((file, i) =>
        i === fileIndex
          ? {
              ...file,
              transactions: file.transactions.map((tx, j) =>
                j === rowIndex ? { ...tx, ...patch } : tx,
              ),
            }
          : file,
      ),
    );
  }

  function handleDeleteTransaction(fileIndex: number, rowIndex: number) {
    setLoadedFiles((prev) =>
      prev.map((file, i) =>
        i === fileIndex
          ? {
              ...file,
              transactions: file.transactions.filter((_, j) => j !== rowIndex),
            }
          : file,
      ),
    );
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
  // ACB only applies to non-registered accounts: exclude TFSA/RRSP/FHSA from
  // the combined holdings and margin interest. By Account mode still receives
  // every account (registered ones show a warning banner).
  const nonRegisteredTransactions = transactions
    ? transactions.filter((tx) => !isRegisteredTransaction(tx))
    : null;
  const holdings = nonRegisteredTransactions
    ? computeHoldings(nonRegisteredTransactions)
    : null;
  const mixedCurrencies = transactions
    ? hasMixedCurrencies(transactions)
    : false;
  const overlappingFiles = detectOverlappingFiles(
    loadedFiles.map((file) => file.transactions),
  );
  const marginInterest = nonRegisteredTransactions
    ? computeMarginInterest(nonRegisteredTransactions)
    : {};
  const marginYears = Object.keys(marginInterest)
    .map(Number)
    .sort((a, b) => a - b);
  const accountGroups = transactions ? groupByAccount(transactions) : null;
  const previewFile =
    previewFileIndex !== null ? (loadedFiles[previewFileIndex] ?? null) : null;
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
            onPreview={setPreviewFileIndex}
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
          <SegmentedControl
            value={viewMode}
            onChange={(value) => {
              if (isViewMode(value)) setViewMode(value);
            }}
            data={[
              { label: "Combined", value: "combined" },
              { label: "By Account", value: "byAccount" },
              { label: "By Year", value: "byYear" },
            ]}
            w="fit-content"
          />
        )}
        {holdings && viewMode === "combined" && (
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
        {holdings && nonRegisteredTransactions && viewMode === "byYear" && (
          <Stack gap="lg">
            {holdings.map((holding) => (
              <Paper key={holding.symbol} withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Title order={2} fz="lg">
                    {holding.symbol}
                  </Title>
                  <YearlyACBTable
                    symbol={holding.symbol}
                    snapshots={computeYearlyACB(
                      nonRegisteredTransactions,
                      holding.symbol,
                    )}
                  />
                  <Text size="sm">
                    Final: {sharesFormatter.format(holding.shares)} shares ·
                    ACB/share{" "}
                    {holding.acbPerShare === null
                      ? "—"
                      : interestFormatter.format(holding.acbPerShare)}{" "}
                    · cost basis {interestFormatter.format(holding.costBasis)}
                  </Text>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
        {accountGroups && viewMode === "byAccount" && (
          <AccountView
            groups={accountGroups}
            t3Slips={t3Slips}
            onEditT3={handleEditT3}
            openingLots={openingLots}
            onOpeningLotChange={handleOpeningLotChange}
          />
        )}
        {viewMode === "combined" && marginYears.length > 0 && (
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
        <FilePreviewModal
          file={previewFile}
          fileIndex={previewFileIndex}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onClose={() => setPreviewFileIndex(null)}
        />
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
