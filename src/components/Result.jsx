import { Alert, List } from "@mantine/core";
import NetWorthChart from "./NetWorthChart";

function validateUserInput(input) {
  const errors = {};

  if (!input.monthlyRent) {
    errors.monthlyRent = "Monthly rent is required";
  } else if (input.monthlyRent <= 0) {
    errors.monthlyRent = "Monthly rent must be greater than $0";
  }

  if (!input.initialHomePrice) {
    errors.initialHomePrice = "Property price is required";
  } else if (input.initialHomePrice <= 0) {
    errors.initialHomePrice = "Property price must be greater than $0";
  }

  if (!input.downPaymentPercentage) {
    errors.downPaymentPercentage = "Down payment percentage is required";
  } else if (
    input.downPaymentPercentage < 5 ||
    input.downPaymentPercentage > 100
  ) {
    errors.downPaymentPercentage = "Down payment must be between 5% and 100%";
  }

  if (!input.mortgageTerm) {
    errors.mortgageTerm = "Mortgage term is required";
  } else if (input.mortgageTerm < 5 || input.mortgageTerm > 30) {
    errors.mortgageTerm = "Mortgage term must be between 5 and 30 years";
  }

  return errors;
}

export default function Result({ userInput }) {
  const errors = validateUserInput(userInput);

  if (Object.keys(errors).length > 0) {
    return (
      <Alert color="red" title="Valid user input is required">
        <List size="sm">
          {Object.keys(errors).map((field) => (
            <List.Item key={field}>{errors[field]}</List.Item>
          ))}
        </List>
      </Alert>
    );
  }

  return <NetWorthChart userInput={userInput} />;
}
