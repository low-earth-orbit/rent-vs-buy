"use client";

import { useState } from "react";
import {
  Accordion,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconRotate } from "@tabler/icons-react";
import UserInputFormItem from "@/components/shared/UserInputFormItem";
import CurrencyPercentItem from "@/components/shared/CurrencyPercentItem";
import {
  RETURN_PRESETS,
  WITHDRAWAL_RATE_PRESETS,
  type ReturnPreset,
  type WithdrawalRatePreset,
} from "@/utils/retirement/presets";
import { FIELD_CONSTRAINTS } from "@/utils/retirement/validation";
import type {
  RetirementErrors,
  RetirementInput,
  RetirementInputKey,
  WithdrawalRateMode,
} from "@/utils/retirement/types";
import type { FieldValue } from "@/types";

interface InputFormProps {
  input: RetirementInput;
  errors: RetirementErrors;
  onChange: (key: RetirementInputKey, value: FieldValue) => void;
  onWithdrawalRatePreset: (rate: number) => void;
  onWithdrawalRateCustomChange: (value: FieldValue) => void;
  onUseRecommendedWithdrawalRate: () => void;
  onReset: () => void;
  recommendedWithdrawalPreset?: WithdrawalRatePreset;
  recommendedWithdrawalHorizonYears?: number;
  withdrawalRateMode: WithdrawalRateMode;
}

export default function InputForm({
  input,
  errors,
  onChange,
  onWithdrawalRatePreset,
  onWithdrawalRateCustomChange,
  onUseRecommendedWithdrawalRate,
  onReset,
  recommendedWithdrawalPreset,
  recommendedWithdrawalHorizonYears,
  withdrawalRateMode,
}: InputFormProps) {
  const [customizeWithdrawalRate, setCustomizeWithdrawalRate] = useState(false);
  const [customizeReturns, setCustomizeReturns] = useState(false);

  const bind = (key: RetirementInputKey) => (value: FieldValue) =>
    onChange(key, value);

  const isSameRate = (value: FieldValue, presetValue: number) =>
    typeof value === "number" && Math.abs(value - presetValue) < 0.001;

  const activeWithdrawalPreset = WITHDRAWAL_RATE_PRESETS.find((preset) =>
    isSameRate(input.swr, preset.rate),
  );
  const activeReturnPreset = RETURN_PRESETS.find(
    (preset) =>
      isSameRate(input.accumReturn, preset.accumReturn) &&
      isSameRate(input.retireReturn, preset.retireReturn),
  );
  const showWithdrawalRateInput =
    customizeWithdrawalRate || !activeWithdrawalPreset;
  const showReturnInputs = customizeReturns || !activeReturnPreset;
  const withdrawalRateStatus =
    withdrawalRateMode === "auto"
      ? "Auto"
      : activeWithdrawalPreset
        ? "Preset"
        : "Custom";
  const returnStatus = activeReturnPreset ? "Preset" : "Custom";

  const applyReturnPreset = (preset: ReturnPreset) => {
    setCustomizeReturns(false);
    onChange("accumReturn", preset.accumReturn);
    onChange("retireReturn", preset.retireReturn);
  };

  const applyWithdrawalPreset = (preset: WithdrawalRatePreset) => {
    setCustomizeWithdrawalRate(false);
    onWithdrawalRatePreset(preset.rate);
  };

  const useRecommendedWithdrawalRate = () => {
    setCustomizeWithdrawalRate(false);
    onUseRecommendedWithdrawalRate();
  };

  const num = (key: RetirementInputKey) => {
    const c = FIELD_CONSTRAINTS[key];
    return {
      id: key,
      min: c.min,
      max: c.max,
      step: c.step,
      value: input[key] as FieldValue,
      onChange: bind(key),
      error: errors[key],
    };
  };

  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" mb="sm">
        <Button
          variant="subtle"
          size="compact-sm"
          leftSection={<IconRotate size={14} />}
          onClick={onReset}
        >
          Reset to defaults
        </Button>
      </Group>

      <Accordion multiple defaultValue={["you", "goals", "assumptions"]}>
        <Accordion.Item value="you">
          <Accordion.Control>About you</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <UserInputFormItem
                  {...num("currentAge")}
                  label="Current age"
                  suffix=" yrs"
                />
                <UserInputFormItem
                  {...num("currentIncome")}
                  label="Current annual income"
                  labelHelperText="Gross income today. Used as the base for your savings rate and guaranteed-income percentages."
                  prefix="$"
                  thousandSeparator
                />
                <UserInputFormItem
                  {...num("currentSavings")}
                  label="Current savings"
                  labelHelperText="Total invested across RRSP, TFSA, and non-registered accounts today."
                  prefix="$"
                  thousandSeparator
                />
                <CurrencyPercentItem
                  id="contributionPct"
                  label="Annual savings"
                  helperText="How much you add to investments each year. Toggle between a dollar amount and a % of your income."
                  unitAriaLabel="Annual savings input unit"
                  rate={input.contributionPct}
                  percentBase={+input.currentIncome || 0}
                  onChange={bind("contributionPct")}
                  error={errors.contributionPct}
                  defaultUnit="%"
                  amountStep={1000}
                  percentStep={5}
                />
              </SimpleGrid>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="goals">
          <Accordion.Control>Retirement goals</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <CurrencyPercentItem
                  id="targetIncomePct"
                  label="Target income"
                  helperText="The gross income you want in retirement — as a % of your current income (a replacement ratio of 60–70% is typical) or a dollar amount. Your guaranteed income below counts toward this."
                  unitAriaLabel="Target retirement income input unit"
                  rate={input.targetIncomePct}
                  percentBase={+input.currentIncome || 0}
                  onChange={bind("targetIncomePct")}
                  error={errors.targetIncomePct}
                  defaultUnit="%"
                  amountStep={1000}
                  percentStep={5}
                />
                <CurrencyPercentItem
                  id="guaranteedIncomePct"
                  label="Pension amount"
                  helperText="Estimated CPP + OAS + workplace (DB) pension income, starting at retirement. Toggle between a dollar amount and a % of your income."
                  unitAriaLabel="Guaranteed income input unit"
                  rate={input.guaranteedIncomePct}
                  percentBase={+input.currentIncome || 0}
                  onChange={bind("guaranteedIncomePct")}
                  error={errors.guaranteedIncomePct}
                  defaultUnit="$"
                  amountStep={1000}
                  percentStep={5}
                />
                <UserInputFormItem
                  {...num("planningAge")}
                  label="Plan until age"
                  labelHelperText="The age your savings should last to (life expectancy). 95 is a common planning horizon."
                  suffix=" yrs"
                />
              </SimpleGrid>
              <Stack gap={6}>
                <Group justify="space-between" align="center" gap="xs">
                  <Text size="sm" fw={600}>
                    Safe initial withdrawal rate
                  </Text>
                  <Text size="xs" c="dimmed">
                    {withdrawalRateStatus}
                  </Text>
                </Group>
                {recommendedWithdrawalPreset &&
                  recommendedWithdrawalHorizonYears != null && (
                    <Text size="xs" c="dimmed">
                      This rate determines your retirement income following the
                      constant $ amount withdrawal strategy. Recommended{" "}
                      {recommendedWithdrawalPreset.label} for a{" "}
                      {Math.round(recommendedWithdrawalHorizonYears)}y horizon.
                    </Text>
                  )}
                <Group
                  gap="xs"
                  role="group"
                  aria-label="Initial withdrawal rate"
                >
                  {WITHDRAWAL_RATE_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      variant={
                        activeWithdrawalPreset?.id === preset.id
                          ? "filled"
                          : "light"
                      }
                      size="xs"
                      radius="lg"
                      aria-pressed={activeWithdrawalPreset?.id === preset.id}
                      onClick={() => applyWithdrawalPreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </Group>
                {showWithdrawalRateInput && (
                  <div className="mt-2">
                    <UserInputFormItem
                      {...num("swr")}
                      label={undefined}
                      onChange={onWithdrawalRateCustomChange}
                      suffix="%"
                    />
                  </div>
                )}
                <Group gap="xs">
                  {!showWithdrawalRateInput && (
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      color="gray"
                      onClick={() => setCustomizeWithdrawalRate(true)}
                    >
                      Customize
                    </Button>
                  )}
                  {withdrawalRateMode === "custom" &&
                    recommendedWithdrawalPreset && (
                      <Button
                        variant="subtle"
                        size="compact-xs"
                        color="teal"
                        onClick={useRecommendedWithdrawalRate}
                      >
                        Use recommendation
                      </Button>
                    )}
                </Group>
              </Stack>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="assumptions">
          <Accordion.Control>Market Assumptions</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Stack gap={6}>
                <Group justify="space-between" align="center" gap="xs">
                  <Text size="sm" fw={600}>
                    Glide path / expected return
                  </Text>
                  <Text size="xs" c="dimmed">
                    {returnStatus}
                  </Text>
                </Group>
                <SimpleGrid
                  cols={{ base: 1, xs: 3 }}
                  spacing="xs"
                  role="group"
                  aria-label="Portfolio return presets"
                >
                  {RETURN_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      variant={
                        activeReturnPreset?.id === preset.id
                          ? "filled"
                          : "light"
                      }
                      size="xs"
                      radius="lg"
                      h={44}
                      aria-pressed={activeReturnPreset?.id === preset.id}
                      onClick={() => applyReturnPreset(preset)}
                    >
                      <Stack gap={0} align="center">
                        <Text span size="xs" fw={700}>
                          {preset.label}
                        </Text>
                        <Text span size="10px">
                          {preset.accumReturn === preset.retireReturn
                            ? `${preset.accumReturn}%`
                            : `${preset.accumReturn}% / ${preset.retireReturn}%`}
                        </Text>
                      </Stack>
                    </Button>
                  ))}
                </SimpleGrid>
                {!showReturnInputs && (
                  <Group>
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      color="gray"
                      onClick={() => setCustomizeReturns(true)}
                    >
                      Customize
                    </Button>
                  </Group>
                )}
              </Stack>
              {showReturnInputs && (
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <UserInputFormItem
                    {...num("accumReturn")}
                    label="Return while working"
                    suffix="%"
                  />
                  <UserInputFormItem
                    {...num("retireReturn")}
                    label="Return in retirement"
                    suffix="%"
                  />
                </SimpleGrid>
              )}
              <UserInputFormItem
                {...num("inflationRate")}
                label="Inflation"
                suffix="%"
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Card>
  );
}
