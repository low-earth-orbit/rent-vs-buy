import { useState } from "react";
import {
  Alert,
  Container,
  List,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import FileUpload from "./FileUpload";
import HoldingsTable, {
  type OpeningLots,
  type T3Adjustments,
} from "./HoldingsTable";
import {
  computeHoldings,
  detectOverlappingFiles,
  hasMixedCurrencies,
  parseWealthsimpleCsv,
  type AcbTransaction,
} from "@/utils/acb/parser";

const Main = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [transactionsByFile, setTransactionsByFile] = useState<
    AcbTransaction[][] | null
  >(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [t3Adjustments, setT3Adjustments] = useState<T3Adjustments>({});
  const [openingLots, setOpeningLots] = useState<OpeningLots>({});

  async function handleFileChange(nextFiles: File[]) {
    setFiles(nextFiles);
    setTransactionsByFile(null);
    setParseErrors([]);
    setT3Adjustments({});
    setOpeningLots({});
    if (nextFiles.length === 0) return;

    const perFile: AcbTransaction[][] = [];
    const errors: string[] = [];
    for (const file of nextFiles) {
      let text: string;
      try {
        text = await file.text();
      } catch {
        errors.push(`${file.name}: could not read the file.`);
        continue;
      }
      const result = parseWealthsimpleCsv(text);
      if (result.ok) {
        perFile.push(result.transactions);
      } else {
        errors.push(`${file.name}: ${result.error}`);
      }
    }
    setParseErrors(errors);
    setTransactionsByFile(perFile.length > 0 ? perFile : null);
  }

  function handleT3Change(symbol: string, value: number) {
    setT3Adjustments((prev) => ({ ...prev, [symbol]: value }));
  }

  function handleOpeningLotChange(symbol: string, value: number) {
    setOpeningLots((prev) => ({ ...prev, [symbol]: value }));
  }

  // Merge all files into one chronologically sorted transaction list.
  const transactions = transactionsByFile
    ? transactionsByFile
        .flat()
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    : null;
  const holdings = transactions ? computeHoldings(transactions) : null;
  const mixedCurrencies = transactions
    ? hasMixedCurrencies(transactions)
    : false;
  const overlappingFiles = transactionsByFile
    ? detectOverlappingFiles(transactionsByFile)
    : false;

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Paper withBorder p="md" radius="md">
          <FileUpload files={files} onFileChange={handleFileChange} />
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
                ACB/share stays constant after a sale. Enter the{" "}
                <strong>return of capital (ROC)</strong> amount from box 42 of
                your T3 slip to reduce a fund&apos;s cost basis. For holdings
                with transferred-in shares, enter the{" "}
                <strong>opening lot ACB</strong> (total cost basis of the
                transferred shares) so the ACB is complete.
              </Text>
              <HoldingsTable
                holdings={holdings}
                t3Adjustments={t3Adjustments}
                onT3Change={handleT3Change}
                openingLots={openingLots}
                onOpeningLotChange={handleOpeningLotChange}
              />
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};

export default Main;
