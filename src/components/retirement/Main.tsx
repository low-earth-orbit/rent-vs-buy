"use client";

import { useState } from "react";
import { Container, Grid } from "@mantine/core";
import InputForm from "./InputForm";
import Result from "./Result";
import {
  DEFAULTS,
  getWithdrawalRatePresetForHorizon,
  type WithdrawalRatePreset,
} from "@/utils/retirement/presets";
import { estimateRetirementHorizonYears } from "@/utils/retirement/projection";
import {
  loadInput,
  loadWithdrawalRateMode,
  saveInput,
  saveWithdrawalRateMode,
} from "@/utils/retirement/storage";
import { validateRetirementInput } from "@/utils/retirement/validation";
import type {
  RetirementInput,
  RetirementInputKey,
  WithdrawalRateMode,
} from "@/utils/retirement/types";
import type { FieldValue } from "@/types";

interface WithdrawalRateRecommendation {
  horizonYears: number;
  preset: WithdrawalRatePreset;
}

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
  "swr",
];

function isNumericInput(input: RetirementInput): boolean {
  return RECOMMENDATION_INPUTS.every((key) => {
    const value = input[key];
    return typeof value === "number" && Number.isFinite(value);
  });
}

function isSameRate(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
}

function getWithdrawalRateRecommendation(
  input: RetirementInput,
): WithdrawalRateRecommendation | null {
  if (!isNumericInput(input) || input.planningAge <= input.currentAge) {
    return null;
  }

  const horizonYears = estimateRetirementHorizonYears(input);
  return {
    horizonYears,
    preset: getWithdrawalRatePresetForHorizon(horizonYears),
  };
}

function createInitialState(): {
  input: RetirementInput;
  withdrawalRateMode: WithdrawalRateMode;
} {
  let input = loadInput();
  const recommendation = getWithdrawalRateRecommendation(input);
  const fallbackMode =
    recommendation && isSameRate(input.swr, recommendation.preset.rate)
      ? "auto"
      : "custom";

  const withdrawalRateMode = loadWithdrawalRateMode(fallbackMode);
  if (
    withdrawalRateMode === "auto" &&
    recommendation &&
    !isSameRate(input.swr, recommendation.preset.rate)
  ) {
    input = { ...input, swr: recommendation.preset.rate };
    saveInput(input);
  }

  return { input, withdrawalRateMode };
}

export default function Main() {
  const [initialState] = useState(createInitialState);
  const [input, setInput] = useState<RetirementInput>(initialState.input);
  const [withdrawalRateMode, setWithdrawalRateMode] =
    useState<WithdrawalRateMode>(initialState.withdrawalRateMode);

  const withdrawalRateRecommendation = getWithdrawalRateRecommendation(input);

  function handleChange(key: RetirementInputKey, value: FieldValue) {
    setInput((prev) => {
      // Keep "" while editing (mirrors rent-vs-buy); validation flags it.
      let next = {
        ...prev,
        [key]: value ? +value : value,
      } as RetirementInput;

      if (withdrawalRateMode === "auto" && key !== "swr") {
        const recommendation = getWithdrawalRateRecommendation(next);
        if (recommendation) {
          next = { ...next, swr: recommendation.preset.rate };
        }
      }

      saveInput(next);
      return next;
    });
  }

  function setWithdrawalRateModeAndSave(mode: WithdrawalRateMode) {
    setWithdrawalRateMode(mode);
    saveWithdrawalRateMode(mode);
  }

  function handleWithdrawalRatePreset(rate: number) {
    setWithdrawalRateModeAndSave("custom");
    handleChange("swr", rate);
  }

  function handleWithdrawalRateCustomChange(value: FieldValue) {
    setWithdrawalRateModeAndSave("custom");
    handleChange("swr", value);
  }

  function handleUseRecommendedWithdrawalRate() {
    if (!withdrawalRateRecommendation) return;
    setWithdrawalRateModeAndSave("auto");
    handleChange("swr", withdrawalRateRecommendation.preset.rate);
  }

  function handleReset() {
    const fresh: RetirementInput = { ...DEFAULTS };
    const recommendation = getWithdrawalRateRecommendation(fresh);
    if (recommendation) fresh.swr = recommendation.preset.rate;

    setInput(fresh);
    saveInput(fresh);
    setWithdrawalRateModeAndSave("auto");
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
            onWithdrawalRatePreset={handleWithdrawalRatePreset}
            onWithdrawalRateCustomChange={handleWithdrawalRateCustomChange}
            onUseRecommendedWithdrawalRate={handleUseRecommendedWithdrawalRate}
            onReset={handleReset}
            recommendedWithdrawalPreset={withdrawalRateRecommendation?.preset}
            recommendedWithdrawalHorizonYears={
              withdrawalRateRecommendation?.horizonYears
            }
            withdrawalRateMode={withdrawalRateMode}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Result input={input} errors={errors} />
        </Grid.Col>
      </Grid>
    </Container>
  );
}
