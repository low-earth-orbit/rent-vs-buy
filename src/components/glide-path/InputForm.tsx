"use client";

import {
  Accordion,
  Box,
  Button,
  Group,
  SimpleGrid,
  Slider,
  Stack,
  Text,
} from "@mantine/core";
import UserInputFormItem from "@/components/shared/UserInputFormItem";
import { GAMMA_PRESETS } from "@/utils/glide-path/presets";
import { FIELD_CONSTRAINTS } from "@/utils/glide-path/validation";
import type {
  GlidePathErrors,
  GlidePathInput,
  GlidePathInputKey,
} from "@/utils/glide-path/types";
import type { FieldValue } from "@/types";
import FormResetButton from "../shared/FormResetButton";

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
      <FormResetButton onReset={onReset} />

      <Accordion
        multiple
        defaultValue={["you", "income", "prefs"]}
        variant="contained"
      >
        <Accordion.Item value="you">
          <Accordion.Control>About You</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                {...num("startAge")}
                label="Start Age"
                suffix=" yrs"
              />
              <UserInputFormItem
                {...num("retirementAge")}
                label="Retirement Age"
                suffix=" yrs"
              />
              <UserInputFormItem
                {...num("planningAge")}
                label="Plan Until Age"
                labelHelperText="The age your money should last to (life expectancy). 95 is a common horizon."
                suffix=" yrs"
              />
              <UserInputFormItem
                {...num("startSavings")}
                label="Start Savings"
                prefix="$"
                thousandSeparator
              />
              <UserInputFormItem
                {...num("preRetirementIncome")}
                label="Income"
                labelHelperText="Gross income today — the base for the pension %."
                prefix="$"
                thousandSeparator
              />
              <UserInputFormItem
                {...num("annualContribution")}
                label="Annual Savings"
                labelHelperText="Real $ added to the portfolio each year while working."
                prefix="$"
                thousandSeparator
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="income">
          <Accordion.Control>Retirement Income</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                {...num("targetIncome")}
                label="Target Income"
                labelHelperText="Gross retirement income including pensions."
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
                label="Pension Start Age"
                labelHelperText="If later than retirement, your portfolio bridges the gap until it starts."
                suffix=" yrs"
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="prefs">
          <Accordion.Control>Spending &amp; Risk</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="lg">
              <Stack gap={4}>
                <Text size="sm" fw={600}>
                  Spending Flexibility
                </Text>
                <Text size="xs" c="dimmed">
                  0 = fixed real $ every year (rigid). 1 = fully proportional —
                  a 50% portfolio drop means a 50% spending cut.
                </Text>
                <Box w="85%" mx="auto">
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
                    styles={{ markLabel: { fontSize: 11 } }}
                    label={(v) => v.toFixed(2)}
                  />
                </Box>
              </Stack>

              {flex > 0 && (
                <UserInputFormItem
                  {...num("withdrawalRate")}
                  label="Flexible Draw Rate"
                  labelHelperText="When spending flexibly, the % of the current portfolio balance drawn each year. This scales with portfolio performance."
                  suffix="%"
                />
              )}

              <Stack gap={4}>
                <Text size="sm" fw={600}>
                  Risk Aversion (γ)
                </Text>
                <Text size="xs" c="dimmed">
                  CRRA risk aversion: 1 = risk-seeker, 3 = moderate, 8 = very
                  cautious.
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
                <UserInputFormItem {...num("gamma")} label={undefined} />
              </Stack>

              <UserInputFormItem
                {...num("bequestYears")}
                label="Estate Goal"
                labelHelperText="Target estate in YEARS of retirement spending (0 = spend it all)."
                suffix=" yrs"
              />
              <UserInputFormItem
                {...num("beta")}
                label="Time-discount β"
                labelHelperText="Patience: 0.99 = long-horizon planner, 0.97 = standard retirement saver, 0.95 = average household, 0.90 = present-oriented."
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
                  labelHelperText="Your real (after-inflation) borrowing rate."
                  suffix="%"
                />
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="engine">
          <Accordion.Control>Engine</Accordion.Control>
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
