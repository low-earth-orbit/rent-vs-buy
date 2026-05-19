import { useState } from "react";
import { Container, Grid } from "@mantine/core";
import Result from "./Result";
import UserInputForm from "./UserInputForm";
import GitHubCorners from "@uiw/react-github-corners";
import { DEFAULTS } from "../utils/presets";
import { validateUserInput } from "../utils/validation";

const Main = () => {
  const [userInput, setUserInput] = useState(DEFAULTS);
  const errors = validateUserInput(userInput);

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
    <>
      <Container size="lg" py="md">
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <UserInputForm
              userInput={userInput}
              handleChange={handleChange}
              handlePreset={handlePreset}
              errors={errors}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Result userInput={userInput} errors={errors} />
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
