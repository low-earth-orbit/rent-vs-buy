"use client";

import {
  Accordion,
  Box,
  Button,
  Group,
  SimpleGrid,
  Slider,
  Stack,
} from "@mantine/core";
import { IconChartLine } from "@tabler/icons-react";
import UserInputFormItem from "@/components/shared/UserInputFormItem";
import FieldHeader from "@/components/shared/FieldHeader";
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
  onGenerate: () => void;
  generating: boolean;
}

export default function InputForm({
  input,
  errors,
  onChange,
  onReset,
  onGenerate,
  generating,
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
        defaultValue={["you", "retirement", "prefs"]}
        variant="contained"
      >
        <Accordion.Item value="you">
          <Accordion.Control>About you</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                {...num("startAge")}
                label="Current age"
                suffix=" yrs"
              />
              <UserInputFormItem
                {...num("startSavings")}
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

        <Accordion.Item value="retirement">
          <Accordion.Control>Retirement targets</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                {...num("retirementAge")}
                label="Retirement age"
                suffix=" yrs"
              />
              <UserInputFormItem
                {...num("planningAge")}
                label="Plan until"
                labelHelperText="The age your money should last to (life expectancy). 95 is a common horizon."
                suffix=" yrs"
              />
              <UserInputFormItem
                {...num("targetIncome")}
                label="Target retirement income"
                labelHelperText="Gross retirement income including guaranteed income."
                prefix="$"
                thousandSeparator
              />
              <UserInputFormItem
                {...num("guaranteedIncome")}
                label="Guaranteed income"
                labelHelperText="Annual CPP, OAS, DB pension, and other income paid every retirement year, in today's dollars."
                prefix="$"
                thousandSeparator
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="prefs">
          <Accordion.Control>Spending &amp; risk</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="lg">
              <Stack gap={4}>
                <FieldHeader
                  label="Spending flexibility"
                  description="0 = fixed real $ every year, regardless of markets. 1 = withdraw a fixed % of the portfolio, so a 20% drop cuts that withdrawal ~20% (guaranteed income is unaffected)."
                />
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
                  label="Withdrawal rate"
                  labelHelperText="When spending flexibly, the % of the current portfolio balance drawn each year. This scales with portfolio performance."
                  suffix="%"
                />
              )}

              <Stack gap={4}>
                <FieldHeader
                  label="Retirement spending risk aversion (γ)"
                  description="Your tolerance for swings in retirement spending. 1 = aggressive; 3 = moderate; 8 = very cautious."
                />
                <Group
                  gap="xs"
                  my="xs"
                  role="group"
                  aria-label="Retirement spending risk aversion"
                >
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
                {...num("beta")}
                label="Retirement time preference (β)"
                description="How much you want to front-load spending into your earlier, more active retirement years. 1.00 = spread evenly; 0.985 = lean slightly earlier; 0.97 = clearly favor the early years."
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
          <Accordion.Control>Simulation</Accordion.Control>
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
                labelHelperText="More paths = steadier result, slower."
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

      <Button
        fullWidth
        size="md"
        leftSection={<IconChartLine size={18} />}
        onClick={onGenerate}
        loading={generating}
        disabled={Object.keys(errors).length > 0}
        mt="sm"
      >
        Generate allocation paths
      </Button>
    </>
  );
}
