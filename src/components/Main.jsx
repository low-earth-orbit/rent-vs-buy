import { useState } from "react";
import { Container, Grid } from "@mantine/core";
import Result from "./Result";
import UserInputForm from "./UserInputForm";

const Main = () => {
  const [userInput, setUserInput] = useState({
    monthlyRent: 5000,
    rentIncreaseRate: 2.5,
    initialHomePrice: 1000000,
    homePriceGrowthRate: 2,
    buyersClosingCostPercentage: 3,
    sellersClosingCostPercentage: 4,
    propertyTaxRate: 1,
    maintenanceCostPercentage: 2,
    downPaymentPercentage: 20,
    annualMortgageInterestRate: 4.5,
    mortgageTerm: 25,
    investmentReturnRate: 6,
    dividendYield: 2,
    dividendTaxRate: 30,
    investmentGainTax: 15,
  });

  function handleChange(inputIdentifier, newValue) {
    setUserInput((prevUserInput) => {
      return {
        ...prevUserInput,
        [inputIdentifier]: newValue ? +newValue : newValue,
      }; // + converts string to number
    });
  }

  function handlePreset(values) {
    setUserInput(values);
  }

  return (
    <Container size="lg" py="md">
      <Grid gutter="xl">
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <UserInputForm userInput={userInput} handleChange={handleChange} handlePreset={handlePreset} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Result userInput={userInput} />
        </Grid.Col>
      </Grid>
    </Container>
  );
};

export default Main;
