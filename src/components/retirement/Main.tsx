"use client";

import { useState } from "react";
import { Container, Grid } from "@mantine/core";
import InputForm from "./InputForm";
import Result from "./Result";
import {
  DEFAULTS,
  getWithdrawalRatePresetForHorizon,
} from "@/utils/retirement/presets";
import { estimateRetirementHorizonYears } from "@/utils/retirement/projection";
import { loadInput, saveInput } from "@/utils/retirement/storage";
import { validateRetirementInput } from "@/utils/retirement/validation";
import type {
  RetirementInput,
  RetirementInputKey,
} from "@/utils/retirement/types";
import type { FieldValue } from "@/types";

interface SwrRecommendation {
  rate: number;
  horizonYears: number;
}

// Fields the horizon estimate depends on; the recommendation is skipped while
// any of them is mid-edit (empty / non-finite).
const RECOMMENDATION_INPUTS: RetirementInputKey[] = [
  "currentAge",
  "planningAge",
  "currentSavings",
  "currentIncome",
  "contributionPct",
  "targetIncomePct",
  "guaranteedIncomePct",
  "accumReturn",
  "retireReturn",
  "inflationRate",
];

function getSwrRecommendation(
  input: RetirementInput,
): SwrRecommendation | null {
  const ready = RECOMMENDATION_INPUTS.every((key) =>
    Number.isFinite(input[key]),
  );
  if (!ready || input.planningAge <= input.currentAge) return null;

  const horizonYears = estimateRetirementHorizonYears(input);
  return {
    rate: getWithdrawalRatePresetForHorizon(horizonYears).rate,
    horizonYears,
  };
}

export default function Main() {
  const [input, setInput] = useState<RetirementInput>(() => loadInput());

  const recommendation = getSwrRecommendation(input);

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
    const rec = getSwrRecommendation(fresh);
    if (rec) fresh.swr = rec.rate;
    setInput(fresh);
    saveInput(fresh);
  }

  const errors = validateRetirementInput(input);

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
          <Result input={input} errors={errors} />
        </Grid.Col>
      </Grid>
    </Container>
  );
}
