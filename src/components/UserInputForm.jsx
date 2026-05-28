import { useState } from "react";
import {
  Accordion,
  ActionIcon,
  Button,
  Group,
  Input,
  Modal,
  NumberInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import FieldLabel from "./FieldLabel";
import UserInputFormItem from "./UserInputFormItem";
import UserInputRangeItem from "./UserInputRangeItem";
import { FIELD_CONSTRAINTS } from "../utils/validation";

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
    aria-hidden="true"
    focusable="false"
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
    aria-hidden="true"
    focusable="false"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export default function UserInputForm({
  userInput,
  handleChange,
  handlePreset,
  handleReset,
  expandedFields,
  toggleFieldExpanded,
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
  const [propertyTaxUnit, setPropertyTaxUnit] = useState("$");
  const [maintenanceUnit, setMaintenanceUnit] = useState("%");

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

  // Perturbed variables: base value always, plus an inline ±2σ input + range
  // readout when the field's "± add uncertainty" affordance is expanded.
  const perturbed = (
    baseField,
    sigmaField,
    { label, helperText, disabled },
  ) => (
    <UserInputRangeItem
      baseField={baseField}
      sigmaField={sigmaField}
      label={label}
      helperText={helperText}
      baseValue={userInput[baseField]}
      sigma={userInput[sigmaField]}
      baseConstraint={c(baseField)}
      sigmaConstraint={c(sigmaField)}
      onBaseChange={bind(baseField)}
      onSigmaChange={bind(sigmaField)}
      baseError={errors[baseField]}
      expanded={expandedFields.includes(baseField)}
      onToggleExpand={() => toggleFieldExpanded(baseField, sigmaField)}
      disabled={disabled}
    />
  );

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Group gap="xs" role="group" aria-label="Scenario presets">
          {[...visibleBuiltins, ...customPresets].map((preset) => (
            <Group key={preset.id} gap={0} wrap="nowrap">
              <Button
                variant={variantFor(preset)}
                size="xs"
                radius="lg"
                aria-pressed={activePreset?.id === preset.id}
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
            presets, and discard your edits.
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

      <Accordion
        multiple
        defaultValue={["rent", "property"]}
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
                label: "Rent Growth",
                helperText:
                  "Expected annual growth in rent payments. Typically at or slightly above inflation (2–3%).",
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
                label: "Home Price Appreciation",
                helperText:
                  "Expected annual growth in the home's market value. Long-run world historical average is 0–2% above inflation, roughly 2–4% nominal.",
              })}

              {(() => {
                const homePrice = userInput.initialHomePrice;
                const taxHelper =
                  "Current annual property tax. Switch between dollar amount and rate (% of today's home value). Typical range: 0.5–1.5% depending on municipality.";
                const taxLabel = "Property Tax";

                const rate = userInput.propertyTaxRate;
                const rateIsEmpty = rate === "" || rate == null;
                const displayValue =
                  propertyTaxUnit === "$"
                    ? rateIsEmpty
                      ? ""
                      : homePrice > 0
                        ? Math.round((+rate / 100) * homePrice)
                        : 0
                    : rate;

                const handleTaxChange = (next) => {
                  if (next === "" || next == null) {
                    handleChange("propertyTaxRate", next);
                    return;
                  }
                  if (propertyTaxUnit === "%") {
                    handleChange("propertyTaxRate", next);
                    return;
                  }
                  if (!homePrice || homePrice <= 0) return;
                  // 4 dp avoids floating-point noise like 0.8500000000000001
                  // while preserving $1/yr precision at a $1M home.
                  const pct = (+next / homePrice) * 100;
                  handleChange(
                    "propertyTaxRate",
                    Math.round(pct * 10000) / 10000,
                  );
                };

                return (
                  <Stack gap={4}>
                    <Group
                      justify="space-between"
                      align="center"
                      wrap="nowrap"
                      gap="xs"
                    >
                      <Input.Label htmlFor="propertyTaxRate">
                        <FieldLabel label={taxLabel} helperText={taxHelper} />
                      </Input.Label>
                      <SegmentedControl
                        size="xs"
                        value={propertyTaxUnit}
                        onChange={setPropertyTaxUnit}
                        aria-label="Property Tax input unit"
                        data={[
                          { label: "$", value: "$" },
                          { label: "%", value: "%" },
                        ]}
                      />
                    </Group>
                    <NumberInput
                      id="propertyTaxRate"
                      value={displayValue}
                      onChange={handleTaxChange}
                      error={errors.propertyTaxRate}
                      prefix={propertyTaxUnit === "$" ? "$" : undefined}
                      suffix={propertyTaxUnit === "$" ? " /yr" : "%"}
                      thousandSeparator={
                        propertyTaxUnit === "$" ? "," : undefined
                      }
                      min={0}
                      step={propertyTaxUnit === "$" ? 100 : 0.1}
                      allowNegative={false}
                      clampBehavior="none"
                    />
                  </Stack>
                );
              })()}
              {(() => {
                const homePrice = userInput.initialHomePrice;
                const maintHelper =
                  "Annual repairs and insurance. Toggle % of today's home price or $/yr. Excludes condo fees. Typically 0.5–1% for condos and 1–2% for detached homes.";
                const maintLabel = "Maintenance & Insurance";

                const rate = userInput.maintPct;
                const rateIsEmpty = rate === "" || rate == null;
                const displayValue =
                  maintenanceUnit === "$"
                    ? rateIsEmpty
                      ? ""
                      : homePrice > 0
                        ? Math.round((+rate / 100) * homePrice)
                        : 0
                    : rate;

                const handleMaintChange = (next) => {
                  if (next === "" || next == null) {
                    handleChange("maintPct", next);
                    return;
                  }
                  if (maintenanceUnit === "%") {
                    handleChange("maintPct", next);
                    return;
                  }
                  if (!homePrice || homePrice <= 0) return;
                  const pct = (+next / homePrice) * 100;
                  handleChange("maintPct", Math.round(pct * 10000) / 10000);
                };

                return (
                  <Stack gap={4}>
                    <Group
                      justify="space-between"
                      align="center"
                      wrap="nowrap"
                      gap="xs"
                    >
                      <Input.Label htmlFor="maintPct">
                        <FieldLabel
                          label={maintLabel}
                          helperText={maintHelper}
                        />
                      </Input.Label>
                      <SegmentedControl
                        size="xs"
                        value={maintenanceUnit}
                        onChange={setMaintenanceUnit}
                        aria-label="Maintenance and Insurance input unit"
                        data={[
                          { label: "$", value: "$" },
                          { label: "%", value: "%" },
                        ]}
                      />
                    </Group>
                    <NumberInput
                      id="maintPct"
                      value={displayValue}
                      onChange={handleMaintChange}
                      error={errors.maintPct}
                      prefix={maintenanceUnit === "$" ? "$" : undefined}
                      suffix={maintenanceUnit === "$" ? " /yr" : "%"}
                      thousandSeparator={
                        maintenanceUnit === "$" ? "," : undefined
                      }
                      min={0}
                      step={maintenanceUnit === "$" ? 100 : 0.1}
                      allowNegative={false}
                      clampBehavior="none"
                    />
                  </Stack>
                );
              })()}
              <UserInputFormItem
                id="condoFeesPerMonth"
                label="Condo Fees"
                helperText="Monthly condo or strata fees in today's dollars. Set to $0 for detached homes."
                value={userInput.condoFeesPerMonth}
                onChange={bind("condoFeesPerMonth")}
                error={errors.condoFeesPerMonth}
                prefix="$"
                suffix=" /mo"
                thousandSeparator
                {...c("condoFeesPerMonth")}
              />

              {perturbed("ownerCostGrowthRate", "ownerCostGrowthSigma", {
                label: "Owner Cost Growth",
                helperText:
                  "Expected annual growth in maintenance, property tax, insurance, and condo or strata fees. Typically slightly above inflation, around 2–3.5%.",
              })}

              <UserInputFormItem
                id="holdingPeriod"
                label="Holding Period"
                helperText="How long until you sell. The simulation compares net worth at this year. Canadian homeowners sell after ~10–13 years on average, even with a 25-year mortgage."
                value={userInput.holdingPeriod}
                onChange={bind("holdingPeriod")}
                error={errors.holdingPeriod}
                suffix=" Years"
                {...c("holdingPeriod")}
              />
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
                helperText="Minimum is 20%. This calculator only models conventional mortgages."
                value={userInput.downPaymentPercentage}
                onChange={bind("downPaymentPercentage")}
                error={errors.downPaymentPercentage}
                suffix="%"
                {...c("downPaymentPercentage")}
              />
              <UserInputFormItem
                id="amortization"
                label="Amortization"
                helperText="Total length of the mortgage. This calculator caps amortization at 25 years."
                value={userInput.amortization}
                onChange={bind("amortization")}
                error={errors.amortization}
                suffix=" Years"
                disabled={userInput.downPaymentPercentage === 100}
                {...c("amortization")}
              />
              {perturbed("annualMortgageInterestRate", "mortgageRateSigma", {
                label: "Mortgage Rate",
                helperText:
                  "Annual mortgage interest rate, modeled as variable for the full amortization period. The default reflects the Bank of Canada's neutral policy rate (2.75%) plus a typical lender spread (1.75%).",
                disabled: userInput.downPaymentPercentage === 100,
              })}
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
              })}
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
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="costs">
          <Accordion.Control>Transaction Costs</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                id="buyerClosingCostsPct"
                label="Buyer's Closing Cost"
                helperText="Closing costs for home buyers as a percentage of home price, including land transfer tax, legal fees, and inspections. Typically 1–4% nationally; higher in provinces with larger land transfer taxes."
                value={userInput.buyerClosingCostsPct}
                onChange={bind("buyerClosingCostsPct")}
                error={errors.buyerClosingCostsPct}
                suffix="%"
                {...c("buyerClosingCostsPct")}
              />
              <UserInputFormItem
                id="sellerClosingCostsPct"
                label="Seller's Closing Cost"
                helperText="Closing costs for home sellers as a percentage of home price, primarily realtor commission and legal fees. Typically 4–7% nationally."
                value={userInput.sellerClosingCostsPct}
                onChange={bind("sellerClosingCostsPct")}
                error={errors.sellerClosingCostsPct}
                suffix="%"
                {...c("sellerClosingCostsPct")}
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
