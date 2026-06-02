"use client";

import { useState } from "react";
import {
  Accordion,
  Button,
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
  SUCCESS_RATE_PRESETS,
  type ReturnPreset,
} from "@/utils/retirement/presets";
import { FIELD_CONSTRAINTS } from "@/utils/retirement/validation";
import type {
  RetirementErrors,
  RetirementInput,
  RetirementInputKey,
} from "@/utils/retirement/types";
import type { FieldValue } from "@/types";

interface InputFormProps {
  input: RetirementInput;
  errors: RetirementErrors;
  onChange: (key: RetirementInputKey, value: FieldValue) => void;
  onReset: () => void;
}

export default function InputForm({
  input,
  errors,
  onChange,
  onReset,
}: InputFormProps) {
  const [customizeReturns, setCustomizeReturns] = useState(false);

  const bind = (key: RetirementInputKey) => (value: FieldValue) =>
    onChange(key, value);

  const isSameRate = (value: FieldValue, presetValue: number) =>
    typeof value === "number" && Math.abs(value - presetValue) < 0.001;

  const activeReturnPreset = RETURN_PRESETS.find(
    (preset) =>
      isSameRate(input.accumReturn, preset.accumReturn) &&
      isSameRate(input.retireReturn, preset.retireReturn),
  );
  const showReturnInputs = customizeReturns || !activeReturnPreset;
  const returnStatus = activeReturnPreset ? "Preset" : "Custom";

  const applyReturnPreset = (preset: ReturnPreset) => {
    setCustomizeReturns(false);
    onChange("accumReturn", preset.accumReturn);
    onChange("retireReturn", preset.retireReturn);
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
    <>
      <Button
        variant="subtle"
        size="xs"
        color="red"
        leftSection={<IconRotate size={14} />}
        onClick={onReset}
        my="md"
      >
        Reset to defaults
      </Button>

      <Accordion
        multiple
        defaultValue={["you", "goals", "assumptions"]}
        variant="contained"
      >
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
                  {...num("pensionStartAge")}
                  label="Pension start age"
                  labelHelperText="When your CPP/OAS/pension income begins — usually 65. If you retire before this, your portfolio funds the full target until then (a 'bridge')."
                  suffix=" yrs"
                />
                <UserInputFormItem
                  {...num("planningAge")}
                  label="Plan until age"
                  labelHelperText="The age your savings should last to (life expectancy). 95 is a common planning horizon."
                  suffix=" yrs"
                />
              </SimpleGrid>

              <Stack gap={4}>
                <Text size="sm" fw={600}>
                  Plan confidence
                </Text>
                <Text size="xs" c="dimmed">
                  The share of simulated markets your savings must outlast to
                  your planning age. I run the simulation and return the
                  earliest age that clears this target — higher confidence means
                  retiring later.
                </Text>
                <Group
                  gap="xs"
                  role="group"
                  aria-label="Plan confidence target"
                  my="xs"
                >
                  {SUCCESS_RATE_PRESETS.map((rate) => (
                    <Button
                      key={rate}
                      variant={
                        isSameRate(input.targetSuccessRate, rate)
                          ? "filled"
                          : "light"
                      }
                      size="xs"
                      radius="lg"
                      aria-pressed={isSameRate(input.targetSuccessRate, rate)}
                      onClick={() => onChange("targetSuccessRate", rate)}
                    >
                      {rate}%
                    </Button>
                  ))}
                </Group>
                <UserInputFormItem
                  {...num("targetSuccessRate")}
                  label={undefined}
                  suffix="%"
                />
              </Stack>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="assumptions">
          <Accordion.Control>Market assumptions</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs" mb="xs">
              <Group justify="space-between" align="center" gap="xs">
                <Text size="sm" fw={600}>
                  Expected return
                </Text>
                <Text size="xs" c="dimmed">
                  {returnStatus}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Based on stock / bond mix — e.g. 80/20 is 80% stocks — before
                and after retirement. For simplicity, two distinct allocations
                are used, no gradual transition in-between.
              </Text>
              <SimpleGrid
                cols={{ base: 2, xs: 3 }}
                spacing="xs"
                role="group"
                aria-label="Portfolio return presets"
                my="xs"
              >
                {RETURN_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant={
                      activeReturnPreset?.id === preset.id ? "filled" : "light"
                    }
                    size="xs"
                    radius="lg"
                    h={44}
                    aria-pressed={activeReturnPreset?.id === preset.id}
                    onClick={() => applyReturnPreset(preset)}
                  >
                    <Stack gap={0} align="center">
                      <Text span size="xs" fw={600}>
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
            </Stack>
            <UserInputFormItem
              {...num("inflationRate")}
              label="Inflation"
              suffix="%"
            />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </>
  );
}
