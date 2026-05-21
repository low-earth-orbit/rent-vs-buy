import { useState } from "react";
import {
  Accordion,
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import UserInputFormItem from "./UserInputFormItem";
import UserInputRangeItem from "./UserInputRangeItem";
import { FIELD_CONSTRAINTS, SLIDER_BOUNDS } from "../utils/validation";

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export default function UserInputForm({
  userInput,
  handleChange,
  handleRangeChange,
  handlePreset,
  handleReset,
  simulateUncertainty,
  setSimulateUncertainty,
  errors,
  activePreset,
  visibleBuiltins,
  customPresets,
  onSavePreset,
  onDeletePreset,
}) {
  const [saveOpen, { open: openSave, close: closeSave }] = useDisclosure(false);
  const [resetOpen, { open: openReset, close: closeReset }] =
    useDisclosure(false);
  const [presetName, setPresetName] = useState("");

  const confirmReset = () => {
    handleReset();
    closeReset();
  };

  const variantFor = (preset) =>
    activePreset?.id === preset.id ? "filled" : "light";

  const submitSave = () => {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    onSavePreset(trimmed);
    setPresetName("");
    closeSave();
  };

  const bind = (id) => (value) => handleChange(id, value);
  const c = (id) => FIELD_CONSTRAINTS[id];

  // Perturbed variables: two-thumb range slider in advanced mode, plain
  // single-value input otherwise.
  const perturbed = (
    baseField,
    sigmaField,
    { label, helperText, disabled, maxOverride },
  ) =>
    simulateUncertainty ? (
      <UserInputRangeItem
        label={label}
        helperText={helperText}
        baseValue={userInput[baseField]}
        sigma={userInput[sigmaField]}
        bounds={SLIDER_BOUNDS[baseField]}
        onChange={(range) => handleRangeChange(baseField, sigmaField, range)}
        disabled={disabled}
        maxOverride={maxOverride}
      />
    ) : (
      <UserInputFormItem
        id={baseField}
        label={label}
        helperText={helperText}
        value={userInput[baseField]}
        onChange={bind(baseField)}
        error={errors[baseField]}
        suffix="%"
        disabled={disabled}
        {...c(baseField)}
      />
    );

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Group gap="xs">
          {[...visibleBuiltins, ...customPresets].map((preset) => (
            <Group key={preset.id} gap={0} wrap="nowrap">
              <Button
                variant={variantFor(preset)}
                size="xs"
                radius="lg"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </Button>
              <ActionIcon
                variant="transparent"
                color="gray"
                size="xs"
                onClick={() => onDeletePreset(preset)}
                aria-label={`Delete ${preset.label}`}
              >
                <XIcon />
              </ActionIcon>
            </Group>
          ))}
          <Button
            variant="subtle"
            size="xs"
            color="gray"
            leftSection={<PlusIcon />}
            onClick={openSave}
          >
            Save as preset
          </Button>
          <Button variant="subtle" size="xs" color="red" onClick={openReset}>
            Reset all
          </Button>
        </Group>
      </Stack>

      <Modal
        opened={resetOpen}
        onClose={closeReset}
        title="Reset everything?"
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            This will remove all custom presets, restore any deleted built-in
            presets, discard your edits, and turn off the advanced toggle.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" onClick={closeReset}>
              Cancel
            </Button>
            <Button color="red" onClick={confirmReset}>
              Reset all
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={saveOpen}
        onClose={closeSave}
        title="Save as preset"
        size="sm"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="e.g. My place"
            value={presetName}
            onChange={(e) => setPresetName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitSave();
              }
            }}
            data-autofocus
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" onClick={closeSave}>
              Cancel
            </Button>
            <Button onClick={submitSave} disabled={!presetName.trim()}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Switch
        size="sm"
        label="Set assumption by range"
        description={
          simulateUncertainty
            ? "Specify expected values and ±95% confidence ranges for each assumption over your time horizon."
            : undefined
        }
        checked={simulateUncertainty}
        onChange={(e) => setSimulateUncertainty(e.currentTarget.checked)}
      />

      <Accordion
        multiple
        defaultValue={["rent", "property", "mortgage"]}
        variant="contained"
      >
        <Accordion.Item value="rent">
          <Accordion.Control>Rent</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                id="monthlyRent"
                label="Monthly Rent"
                value={userInput.monthlyRent}
                onChange={bind("monthlyRent")}
                error={errors.monthlyRent}
                prefix="$"
                thousandSeparator
                {...c("monthlyRent")}
              />
              {perturbed("rentIncreaseRate", "rentIncreaseSigma", {
                label: "Rent Change",
                helperText:
                  "Expected annual change in rent. Historically tracks inflation (~2%). Can be negative.",
              })}
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="property">
          <Accordion.Control>Property</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                id="initialHomePrice"
                label="Property Price"
                value={userInput.initialHomePrice}
                onChange={bind("initialHomePrice")}
                error={errors.initialHomePrice}
                prefix="$"
                thousandSeparator
                {...c("initialHomePrice")}
              />
              {perturbed("homePriceGrowthRate", "homePriceGrowthSigma", {
                label: "Home Price Change",
                helperText:
                  "Expected annual change in home price. Long-run world historical average is roughly 2–3.5% nominal. Can be negative.",
              })}
              {perturbed("propertyTaxRate", "propertyTaxSigma", {
                label: "Property Tax Rate",
                helperText:
                  "Annual property tax as a percentage of the home's market value. Typical range: 0.5–1.5% depending on municipality.",
              })}
              {perturbed("maintenanceCostPercentage", "maintenanceSigma", {
                label: "Maintenance",
                helperText:
                  "Annual maintenance costs as a percentage of home price, including repairs, insurance, and condo fees (if applicable). Typically 1–2%, increasing as the home ages.",
              })}
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="mortgage">
          <Accordion.Control>Mortgage</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                id="downPaymentPercentage"
                label="Down Payment"
                helperText="Minimum is 5% in Canada. Down payments below 20% require CMHC mortgage insurance, which is added to the loan principal."
                value={userInput.downPaymentPercentage}
                onChange={bind("downPaymentPercentage")}
                error={errors.downPaymentPercentage}
                suffix="%"
                {...c("downPaymentPercentage")}
              />
              {perturbed("annualMortgageInterestRate", "mortgageRateSigma", {
                label: "Mortgage Rate",
                helperText:
                  "Annual mortgage interest rate, modeled as variable for the full amortization period. The default reflects the Bank of Canada's neutral policy rate (2.75%) plus a typical lender spread (1.75%).",
                disabled: userInput.downPaymentPercentage === 100,
              })}
              <UserInputFormItem
                id="amortizationPeriod"
                label="Amortization Period"
                helperText="Total length of the mortgage. Canadian maximum is 25 or 30 years."
                value={userInput.amortizationPeriod}
                onChange={bind("amortizationPeriod")}
                error={errors.amortizationPeriod}
                suffix=" Years"
                disabled={userInput.downPaymentPercentage === 100}
                {...c("amortizationPeriod")}
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="investment">
          <Accordion.Control>Investment &amp; Tax</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {perturbed("investmentReturnRate", "investmentReturnSigma", {
                label: "Total Portfolio Return",
                helperText:
                  "Expected pre-tax annual return, including dividends and capital gains. The default is based on long-term capital market assumptions for a diversified growth portfolio (XGRO).",
              })}
              {perturbed("dividendYield", "dividendYieldSigma", {
                label: "Dividend Yield",
                helperText:
                  "Portion of the total return paid as dividends each year, taxed annually. Remainder is capital appreciation deferred until sale. Capped at the portfolio return.",
                maxOverride: userInput.investmentReturnRate,
              })}
              <UserInputFormItem
                id="dividendTaxRate"
                label="Dividend Tax Rate"
                helperText="Effective tax rate on annual dividends. Eligible Canadian dividends taxed at a lower rate; foreign dividends at marginal income tax rate."
                value={userInput.dividendTaxRate}
                onChange={bind("dividendTaxRate")}
                error={errors.dividendTaxRate}
                suffix="%"
                {...c("dividendTaxRate")}
              />
              <UserInputFormItem
                id="capitalGainTaxRate"
                label="Capital Gain Tax Rate"
                helperText="Tax rate on capital gains when the portfolio is sold. In Canada, 50% of gains are included in taxable income — multiply your marginal rate by 50% to get this number."
                value={userInput.capitalGainTaxRate}
                onChange={bind("capitalGainTaxRate")}
                error={errors.capitalGainTaxRate}
                suffix="%"
                {...c("capitalGainTaxRate")}
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="costs">
          <Accordion.Control>Transaction Costs</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                id="buyersClosingCostPercentage"
                label="Buyer's Closing Cost"
                helperText="Closing costs for home buyers as a percentage of home price, including land transfer tax, legal fees, and inspections. Typically 1.5–4% nationally; higher in provinces with larger land transfer taxes."
                value={userInput.buyersClosingCostPercentage}
                onChange={bind("buyersClosingCostPercentage")}
                error={errors.buyersClosingCostPercentage}
                suffix="%"
                {...c("buyersClosingCostPercentage")}
              />
              <UserInputFormItem
                id="sellersClosingCostPercentage"
                label="Seller's Closing Cost"
                helperText="Closing costs for home sellers as a percentage of home price, primarily realtor commission and legal fees. Typically 3–5% nationally."
                value={userInput.sellersClosingCostPercentage}
                onChange={bind("sellersClosingCostPercentage")}
                error={errors.sellersClosingCostPercentage}
                suffix="%"
                {...c("sellersClosingCostPercentage")}
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
