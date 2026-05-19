import { Alert } from "@mantine/core";
import NetWorthChart from "./NetWorthChart";

export default function Result({ userInput, errors, simulateUncertainty }) {
  if (Object.keys(errors).length > 0) {
    return (
      <Alert color="gray" title="Incomplete inputs">
        Fix the highlighted fields to see the rent-vs-buy comparison.
      </Alert>
    );
  }

  return (
    <NetWorthChart userInput={userInput} showBands={simulateUncertainty} />
  );
}
