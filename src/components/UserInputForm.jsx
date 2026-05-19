import {
  Accordion,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import UserInputFormItem from "./UserInputFormItem";

const DEFAULTS = {
  monthlyRent: 5000,
  rentIncreaseRate: 2.5,
  initialHomePrice: 1000000,
  homePriceGrowthRate: 2,
  buyersClosingCostPercentage: 3,
  sellersClosingCostPercentage: 4,
  propertyTaxRate: 1,
  maintenanceCostPercentage: 2,
  downPaymentPercentage: 20,
  annualMortgageInterestRate: 4.5,
  mortgageTerm: 25,
  investmentReturnRate: 6,
  dividendYield: 1.5,
  dividendTaxRate: 30,
  investmentGainTax: 15,
};

const PRESETS = [
  { label: "Defaults", values: DEFAULTS },
  {
    label: "Bay Street condo",
    values: {
      ...DEFAULTS,
      monthlyRent: 2600,
      initialHomePrice: 700000,
      maintenanceCostPercentage: 2.5,
      propertyTaxRate: 0.5,
    },
  },
  {
    label: "Calgary SFH",
    values: {
      ...DEFAULTS,
      monthlyRent: 3200,
      initialHomePrice: 850000,
      maintenanceCostPercentage: 2.0,
      propertyTaxRate: 0.9,
    },
  },
];

export default function UserInputForm({
  userInput,
  handleChange,
  handlePreset,
}) {
  const bind = (id) => (value) => handleChange(id, value);

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>
          Presets
        </Text>
        <Group gap="xs">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="light"
              size="xs"
              onClick={() => handlePreset(preset.values)}
            >
              {preset.label}
            </Button>
          ))}
        </Group>
      </Stack>

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
                step={100}
                min={0}
                value={userInput.monthlyRent}
                onChange={bind("monthlyRent")}
                prefix="$"
                thousandSeparator
              />
              <UserInputFormItem
                id="rentIncreaseRate"
                label="Rent Change"
                helperText="Expected annual rent increase. Can be negative if rents in your area are falling."
                step={0.5}
                value={userInput.rentIncreaseRate}
                onChange={bind("rentIncreaseRate")}
                suffix="%"
                allowNegative
              />
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
                step={10000}
                min={0}
                value={userInput.initialHomePrice}
                onChange={bind("initialHomePrice")}
                prefix="$"
                thousandSeparator
              />
              <UserInputFormItem
                id="homePriceGrowthRate"
                label="Home Price Change"
                helperText="Expected annual home price appreciation. Can be negative."
                step={0.5}
                value={userInput.homePriceGrowthRate}
                onChange={bind("homePriceGrowthRate")}
                suffix="%"
                allowNegative
              />
              <UserInputFormItem
                id="propertyTaxRate"
                label="Property Tax Rate"
                helperText="Annual property tax as a percentage of fair-market home value (not necessarily the same as assessed value)."
                step={0.1}
                value={userInput.propertyTaxRate}
                onChange={bind("propertyTaxRate")}
                suffix="%"
              />
              <UserInputFormItem
                id="maintenanceCostPercentage"
                label="Maintenance"
                helperText="Annual maintenance costs as a percentage of home price, including repairs, insurance, condo fees, and other homeowner-specific expenses."
                step={0.1}
                value={userInput.maintenanceCostPercentage}
                onChange={bind("maintenanceCostPercentage")}
                suffix="%"
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
                helperText="Down payments below 20% require CMHC mortgage insurance, which is folded into the loan principal."
                step={5}
                min={5}
                max={100}
                value={userInput.downPaymentPercentage}
                onChange={bind("downPaymentPercentage")}
                suffix="%"
              />
              <UserInputFormItem
                id="annualMortgageInterestRate"
                label="Mortgage Rate"
                step={0.25}
                value={userInput.annualMortgageInterestRate}
                onChange={bind("annualMortgageInterestRate")}
                suffix="%"
                disabled={userInput.downPaymentPercentage === 100}
              />
              <UserInputFormItem
                id="mortgageTerm"
                label="Mortgage Term"
                step={5}
                min={5}
                max={30}
                value={userInput.mortgageTerm}
                onChange={bind("mortgageTerm")}
                suffix="Years"
                disabled={userInput.downPaymentPercentage === 100}
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="investment">
          <Accordion.Control>Investment &amp; Tax</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <UserInputFormItem
                id="investmentReturnRate"
                label="Total Portfolio Return"
                helperText="Expected pre-tax annual return, including both dividends and capital gains. Typical 80/20 growth ETF (e.g. XGRO) returns ~6%."
                step={0.5}
                value={userInput.investmentReturnRate}
                onChange={bind("investmentReturnRate")}
                suffix="%"
              />
              <UserInputFormItem
                id="dividendYield"
                label="Dividend Yield"
                helperText="Portion of the total return paid as dividends each year, taxed annually. Remainder is capital appreciation deferred until sale."
                step={0.5}
                value={userInput.dividendYield}
                onChange={bind("dividendYield")}
                suffix="%"
              />
              <UserInputFormItem
                id="dividendTaxRate"
                label="Dividend Tax Rate"
                helperText="Effective tax rate on annual dividends. Eligible Canadian dividends taxed at a lower rate; foreign dividends at marginal income tax rate."
                step={1}
                value={userInput.dividendTaxRate}
                onChange={bind("dividendTaxRate")}
                suffix="%"
              />
              <UserInputFormItem
                id="investmentGainTax"
                label="Capital Gain Tax Rate"
                helperText="Tax rate applied to the whole amount of capital gains when the portfolio is liquidated. Use your marginal income tax rate x 50%."
                step={1}
                value={userInput.investmentGainTax}
                onChange={bind("investmentGainTax")}
                suffix="%"
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
                helperText="Closing costs for home buyers as a percentage of home price (land transfer tax, legal fees, inspections, etc.)."
                step={0.25}
                value={userInput.buyersClosingCostPercentage}
                onChange={bind("buyersClosingCostPercentage")}
                suffix="%"
              />
              <UserInputFormItem
                id="sellersClosingCostPercentage"
                label="Seller's Closing Cost"
                helperText="Closing costs for home sellers as a percentage of home price (realtor commission, legal fees, etc.)."
                step={0.25}
                value={userInput.sellersClosingCostPercentage}
                onChange={bind("sellersClosingCostPercentage")}
                suffix="%"
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
