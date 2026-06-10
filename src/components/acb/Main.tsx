import { useState } from "react";
import { Alert, Container, Paper, Stack, Text, Title } from "@mantine/core";
import FileUpload from "./FileUpload";
import HoldingsTable, { type T3Adjustments } from "./HoldingsTable";
import {
  computeHoldings,
  hasMixedCurrencies,
  parseWealthsimpleCsv,
  type AcbTransaction,
} from "@/utils/acb/parser";

const Main = () => {
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<AcbTransaction[] | null>(
    null,
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [t3Adjustments, setT3Adjustments] = useState<T3Adjustments>({});

  async function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setTransactions(null);
    setParseError(null);
    setT3Adjustments({});
    if (!nextFile) return;

    let text: string;
    try {
      text = await nextFile.text();
    } catch {
      setParseError("Could not read the selected file.");
      return;
    }
    const result = parseWealthsimpleCsv(text);
    if (result.ok) {
      setTransactions(result.transactions);
    } else {
      setParseError(result.error);
    }
  }

  function handleT3Change(symbol: string, value: number) {
    setT3Adjustments((prev) => ({ ...prev, [symbol]: value }));
  }

  const holdings = transactions ? computeHoldings(transactions) : null;
  const mixedCurrencies = transactions
    ? hasMixedCurrencies(transactions)
    : false;

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Paper withBorder p="md" radius="md">
          <FileUpload
            file={file}
            error={parseError}
            onFileChange={handleFileChange}
          />
        </Paper>
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
                your T3 slip to reduce a fund&apos;s cost basis.
              </Text>
              <HoldingsTable
                holdings={holdings}
                t3Adjustments={t3Adjustments}
                onT3Change={handleT3Change}
              />
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};

export default Main;
