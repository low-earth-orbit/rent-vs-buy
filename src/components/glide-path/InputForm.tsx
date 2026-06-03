"use client";

import {
  Accordion,
  Button,
  Group,
  SimpleGrid,
  Slider,
  Stack,
  Text,
} from "@mantine/core";
import { IconRotate } from "@tabler/icons-react";
import UserInputFormItem from "@/components/shared/UserInputFormItem";
import { GAMMA_PRESETS } from "@/utils/glide-path/presets";
import { FIELD_CONSTRAINTS } from "@/utils/glide-path/validation";
import type {
  GlidePathErrors,
  GlidePathInput,
  GlidePathInputKey,
} from "@/utils/glide-path/types";
import type { FieldValue } from "@/types";

interface InputFormProps {
  input: GlidePathInput;
  errors: GlidePathErrors;
  onChange: (key: GlidePathInputKey, value: FieldValue) => void;
  onReset: () => void;
}

export default function InputForm({
  input,
  errors,
  onChange,
  onReset,
}: InputFormProps) {
  const bind = (key: GlidePathInputKey) => (value: FieldValue) =>
    onChange(key, value);

  const isSame = (value: FieldValue, target: number) =>
    typeof value === "number" && Math.abs(value - target) < 1e-6;

  const num = (key: GlidePathInputKey) => {
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

  const flex = typeof input.flexibility === "number" ? input.flexibility : 0;
  const leveraged =
    typeof input.maxEquityPct === "number" && input.maxEquityPct > 100;

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
        defaultValue={["you", "income", "prefs"]}
        variant="contained"
      >
        <Accordion.Item value="you">
          <Accordion.Control>About you</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                {...num("currentAge")}
                label="Current age"
                suffix=" yrs"
              />
              <UserInputFormItem
                {...num("retirementAge")}
                label="Retirement age"
                suffix=" yrs"
              />
              <UserInputFormItem
                {...num("planningAge")}
                label="Plan until age"
                labelHelperText="The age your money should last to (life expectancy). 95 is a common horizon."
                suffix=" yrs"
              />
              <UserInputFormItem
                {...num("preRetirementIncome")}
                label="Pre-retirement income"
                labelHelperText="Gross income today — the base for the pension %."
                prefix="$"
                thousandSeparator
              />
              <UserInputFormItem
                {...num("currentSavings")}
                label="Current savings"
                prefix="$"
                thousandSeparator
              />
              <UserInputFormItem
                {...num("annualContribution")}
                label="Annual savings"
                labelHelperText="Real $ added to the portfolio each year while working."
                prefix="$"
                thousandSeparator
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="income">
          <Accordion.Control>Retirement income</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                {...num("targetIncome")}
                label="Target spending"
                labelHelperText="Real annual spending you want in retirement (gross)."
                prefix="$"
                thousandSeparator
              />
              <UserInputFormItem
                {...num("pensionPct")}
                label="Pension"
                labelHelperText="Guaranteed income (CPP + OAS + DB) as a % of your pre-retirement income."
                suffix="%"
              />
              <UserInputFormItem
                {...num("pensionStartAge")}
                label="Pension start age"
                labelHelperText="If later than retirement, your portfolio bridges the gap until it starts."
                suffix=" yrs"
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="prefs">
          <Accordion.Control>Spending &amp; risk</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="lg">
              <Stack gap={4}>
                <Text size="sm" fw={600}>
                  Spending flexibility
                </Text>
                <Text size="xs" c="dimmed">
                  0 = fixed real $ every year (rigid). 1 = fully proportional —
                  a 20% portfolio drop means a ~20% spending cut. Flexible
                  spending pushes the optimum toward flat, high equity.
                </Text>
                <Slider
                  my="xs"
                  value={flex}
                  onChange={(v) => onChange("flexibility", v)}
                  min={0}
                  max={1}
                  step={0.05}
                  marks={[
                    { value: 0, label: "Constant $" },
                    { value: 0.5, label: "Half" },
                    { value: 1, label: "Flexible" },
                  ]}
                  label={(v) => v.toFixed(2)}
                />
              </Stack>

              {flex > 0 && (
                <UserInputFormItem
                  {...num("withdrawalRate")}
                  label="Flexible draw rate"
                  labelHelperText="When spending flexibly, the % of the live balance drawn each year (like the 4% rule)."
                  suffix="%"
                />
              )}

              <Stack gap={4}>
                <Text size="sm" fw={600}>
                  Risk aversion (γ)
                </Text>
                <Text size="xs" c="dimmed">
                  CRRA risk aversion: 1 = log, 3 = cautious base, 8 = very
                  cautious. One value drives the whole glide — the declining
                  shape emerges from the savings horizon, not a changing γ.
                </Text>
                <Group gap="xs" my="xs" role="group" aria-label="Risk aversion">
                  {GAMMA_PRESETS.map((g) => (
                    <Button
                      key={g}
                      variant={isSame(input.gamma, g) ? "filled" : "light"}
                      size="xs"
                      radius="lg"
                      aria-pressed={isSame(input.gamma, g)}
                      onClick={() => onChange("gamma", g)}
                    >
                      {g}
                    </Button>
                  ))}
                </Group>
                <UserInputFormItem
                  {...num("gamma")}
                  label={undefined}
                  additionalText="Custom γ"
                />
              </Stack>

              <UserInputFormItem
                {...num("bequestYears")}
                label="Estate goal"
                labelHelperText="Target estate in YEARS of retirement spending (0 = spend it all). Calibrating a target makes the run slower."
                suffix=" yrs"
              />
              <UserInputFormItem
                {...num("beta")}
                label="Time-discount β"
                labelHelperText="Patience: 0.99 = very patient, 0.97 = discounts the future more."
                step={0.005}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="leverage">
          <Accordion.Control>Leverage</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <UserInputFormItem
                {...num("maxEquityPct")}
                label="Max equity"
                labelHelperText="100% = no leverage. 150% lets the optimizer borrow to hold up to 1.5× equity."
                suffix="%"
              />
              {leveraged && (
                <UserInputFormItem
                  {...num("borrowCost")}
                  label="Real cost of borrowing"
                  labelHelperText="Your real (after-inflation) borrowing rate. Higher cost ⇒ less leverage used."
                  suffix="%"
                />
              )}
              <Text size="xs" c="dimmed">
                The optimizer leverages only where the risk-adjusted gain beats
                the borrowing drag — typically early in accumulation under a low
                γ.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="engine">
          <Accordion.Control>Engine (for nerds)</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                {...num("interval")}
                label="Glide step"
                labelHelperText="Years the equity weight is held constant. 1 = per-age (much slower); 5 = every 5 years."
                suffix=" yrs"
              />
              <UserInputFormItem
                {...num("numPaths")}
                label="Monte Carlo paths"
                labelHelperText="More paths = steadier result, slower. 2000 is a good balance."
                thousandSeparator
              />
              <UserInputFormItem
                {...num("inflation")}
                label="Inflation"
                labelHelperText="Used to deflate the return curve to real terms."
                suffix="%"
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </>
  );
}
