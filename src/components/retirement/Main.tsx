"use client";

import { useState } from "react";
import { Container, Grid } from "@mantine/core";
import InputForm from "./InputForm";
import Result from "./Result";
import {
  DEFAULTS,
  getWithdrawalRatePresetForHorizon,
} from "@/utils/retirement/presets";
import { computeRetirement } from "@/utils/retirement/projection";
import { loadInput, saveInput } from "@/utils/retirement/storage";
import { validateRetirementInput } from "@/utils/retirement/validation";
import type {
  RetirementInput,
  RetirementInputKey,
  RetirementResult,
} from "@/utils/retirement/types";
import type { FieldValue } from "@/types";

interface SwrRecommendation {
  rate: number;
  horizonYears: number;
}

function getSwrRecommendation(
  input: RetirementInput,
  result: RetirementResult,
): SwrRecommendation {
  const retirementAge = result.earliestRetirementAge ?? input.currentAge;
  const horizonYears = Math.max(0, input.planningAge - retirementAge);
  return {
    rate: getWithdrawalRatePresetForHorizon(horizonYears).rate,
    horizonYears,
  };
}

export default function Main() {
  const [input, setInput] = useState<RetirementInput>(() => loadInput());

  const errors = validateRetirementInput(input);
  // Only run the engine on valid input; "" mid-edit fields would poison it.
  const result =
    Object.keys(errors).length === 0 ? computeRetirement(input) : null;
  const recommendation = result ? getSwrRecommendation(input, result) : null;

  function handleChange(key: RetirementInputKey, value: FieldValue) {
    setInput((prev) => {
      // Keep "" while editing (mirrors rent-vs-buy); validation flags it.
      const next = {
        ...prev,
        [key]: value ? +value : value,
      } as RetirementInput;
      saveInput(next);
      return next;
    });
  }

  function handleUseRecommendedSwr() {
    if (recommendation) handleChange("swr", recommendation.rate);
  }

  function handleReset() {
    const fresh: RetirementInput = { ...DEFAULTS };
    fresh.swr = getSwrRecommendation(fresh, computeRetirement(fresh)).rate;
    setInput(fresh);
    saveInput(fresh);
  }

  return (
    <Container size="xl" pb="xl">
      <Grid gap="xl">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <InputForm
            input={input}
            errors={errors}
            onChange={handleChange}
            onUseRecommendedSwr={handleUseRecommendedSwr}
            onReset={handleReset}
            recommendedSwr={recommendation?.rate}
            recommendedHorizonYears={recommendation?.horizonYears}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Result input={input} result={result} />
        </Grid.Col>
      </Grid>
    </Container>
  );
}
