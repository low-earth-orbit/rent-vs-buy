import { useState } from "react";
import { Container, Paper, Stack, Text, Title } from "@mantine/core";
import FileUpload from "./FileUpload";
import HoldingsTable, { type T3Adjustments } from "./HoldingsTable";
import {
  computeHoldings,
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

  return (
    <Container size="md" py="md">
      <Stack gap="lg">
        <Paper withBorder p="md" radius="md">
          <FileUpload
            file={file}
            error={parseError}
            onFileChange={handleFileChange}
          />
        </Paper>
        {holdings && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Title order={2} fz="lg">
                Holdings
              </Title>
              <Text c="dimmed" size="sm">
                ACB per share = total cost basis ÷ shares held. Sells reduce
                shares but not the cost basis pool. Enter reinvested (phantom)
                distributions from your T3 slips to add them to a fund&apos;s
                cost basis.
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
