import { useState } from "react";
import { Container, Grid } from "@mantine/core";
import Result from "./Result";
import UserInputForm from "./UserInputForm";
import GitHubCorners from "@uiw/react-github-corners";
import { DEFAULTS } from "../utils/presets";
import { validateUserInput } from "../utils/validation";

const Main = () => {
  const [userInput, setUserInput] = useState(DEFAULTS);
  const [simulateUncertainty, setSimulateUncertainty] = useState(false);
  const errors = validateUserInput(userInput);

  function handleChange(inputIdentifier, newValue) {
    setUserInput((prevUserInput) => {
      return {
        ...prevUserInput,
        [inputIdentifier]: newValue ? +newValue : newValue,
      }; // + converts string to number
    });
  }

  function handleRangeChange(baseField, sigmaField, [low, high]) {
    setUserInput((prev) => ({
      ...prev,
      [baseField]: (low + high) / 2,
      [sigmaField]: (high - low) / 4,
    }));
  }

  function handlePreset(values) {
    setUserInput(values);
  }

  return (
    <>
      <Container size="lg" py="md">
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <UserInputForm
              userInput={userInput}
              handleChange={handleChange}
              handleRangeChange={handleRangeChange}
              handlePreset={handlePreset}
              simulateUncertainty={simulateUncertainty}
              setSimulateUncertainty={setSimulateUncertainty}
              errors={errors}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 5 }}>
            <Result
              userInput={userInput}
              errors={errors}
              simulateUncertainty={simulateUncertainty}
            />
          </Grid.Col>
        </Grid>
      </Container>
      <GitHubCorners
        position="left"
        href="https://github.com/low-earth-orbit/rent-vs-buy"
      />
    </>
  );
};

export default Main;
