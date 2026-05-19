import { Accordion, Button, Group, SimpleGrid, Stack, Text } from "@mantine/core";
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
  dividendYield: 2,
  dividendTaxRate: 30,
  investmentGainTax: 15,
};

const PRESETS = [
  { label: "Defaults", values: DEFAULTS },
  {
    label: "Starter condo",
    values: {
      ...DEFAULTS,
      monthlyRent: 2200,
      initialHomePrice: 550000,
      downPaymentPercentage: 10,
      mortgageTerm: 25,
      annualMortgageInterestRate: 5,
    },
  },
  {
    label: "City SFH",
    values: {
      ...DEFAULTS,
      monthlyRent: 4500,
      initialHomePrice: 1500000,
      downPaymentPercentage: 20,
      mortgageTerm: 25,
    },
  },
];

export default function UserInputForm({ userInput, handleChange, handlePreset }) {
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

      <Accordion multiple defaultValue={["rent", "property", "mortgage"]} variant="contained">
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
                prependText="$"
                thousandSeparator
              />
              <UserInputFormItem
                id="rentIncreaseRate"
                label="Rent Change"
                helperText="Expected annual rent increase. Can be negative if rents in your area are falling."
                step={0.5}
                value={userInput.rentIncreaseRate}
                onChange={bind("rentIncreaseRate")}
                appendText="%"
                allowNegative
                sliderMin={-5}
                sliderMax={10}
                sliderStep={0.5}
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
                prependText="$"
                thousandSeparator
              />
              <UserInputFormItem
                id="homePriceGrowthRate"
                label="Home Price Change"
                helperText="Expected annual home price appreciation. Can be negative."
                step={0.5}
                value={userInput.homePriceGrowthRate}
                onChange={bind("homePriceGrowthRate")}
                appendText="%"
                allowNegative
                sliderMin={-5}
                sliderMax={10}
                sliderStep={0.5}
              />
              <UserInputFormItem
                id="propertyTaxRate"
                label="Property Tax Rate"
                helperText="Annual property tax as a percentage of assessed home value."
                step={0.1}
                value={userInput.propertyTaxRate}
                onChange={bind("propertyTaxRate")}
                appendText="%"
                sliderMin={0}
                sliderMax={3}
                sliderStep={0.1}
              />
              <UserInputFormItem
                id="maintenanceCostPercentage"
                label="Depreciation & Maintenance"
                helperText="Annual depreciation and maintenance as a percentage of home price."
                step={0.1}
                value={userInput.maintenanceCostPercentage}
                onChange={bind("maintenanceCostPercentage")}
                appendText="%"
                sliderMin={0}
                sliderMax={5}
                sliderStep={0.25}
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
                appendText="%"
                sliderMin={5}
                sliderMax={100}
                sliderStep={5}
              />
              <UserInputFormItem
                id="annualMortgageInterestRate"
                label="Mortgage Rate"
                step={0.25}
                value={userInput.annualMortgageInterestRate}
                onChange={bind("annualMortgageInterestRate")}
                appendText="%"
                disabled={userInput.downPaymentPercentage === 100}
                sliderMin={1}
                sliderMax={10}
                sliderStep={0.25}
              />
              <UserInputFormItem
                id="mortgageTerm"
                label="Mortgage Term"
                step={5}
                min={5}
                max={30}
                value={userInput.mortgageTerm}
                onChange={bind("mortgageTerm")}
                appendText="Years"
                disabled={userInput.downPaymentPercentage === 100}
                sliderMin={5}
                sliderMax={30}
                sliderStep={5}
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
                helperText="Expected pre-tax annual return, including both dividends and capital gains. Typical 80/20 growth ETF: ~6%."
                step={0.5}
                value={userInput.investmentReturnRate}
                onChange={bind("investmentReturnRate")}
                appendText="%"
                sliderMin={0}
                sliderMax={15}
                sliderStep={0.5}
              />
              <UserInputFormItem
                id="dividendYield"
                label="Dividend Yield"
                helperText="Portion of the total return paid as dividends each year, taxed annually. Remainder is capital appreciation deferred until sale."
                step={0.5}
                value={userInput.dividendYield}
                onChange={bind("dividendYield")}
                appendText="%"
                sliderMin={0}
                sliderMax={10}
                sliderStep={0.5}
              />
              <UserInputFormItem
                id="dividendTaxRate"
                label="Dividend Tax Rate"
                helperText="Effective tax rate on annual dividends. Eligible Canadian dividends ~25–30%; foreign dividends at marginal rate."
                step={1}
                value={userInput.dividendTaxRate}
                onChange={bind("dividendTaxRate")}
                appendText="%"
                sliderMin={0}
                sliderMax={55}
                sliderStep={1}
              />
              <UserInputFormItem
                id="investmentGainTax"
                label="Capital Gain Tax Rate"
                helperText="Tax rate applied to capital gains (total return minus dividends) when the portfolio is liquidated."
                step={1}
                value={userInput.investmentGainTax}
                onChange={bind("investmentGainTax")}
                appendText="%"
                sliderMin={0}
                sliderMax={55}
                sliderStep={1}
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
                appendText="%"
                sliderMin={0}
                sliderMax={10}
                sliderStep={0.25}
              />
              <UserInputFormItem
                id="sellersClosingCostPercentage"
                label="Seller's Closing Cost"
                helperText="Closing costs for home sellers as a percentage of home price (realtor commission, legal fees, etc.)."
                step={0.25}
                value={userInput.sellersClosingCostPercentage}
                onChange={bind("sellersClosingCostPercentage")}
                appendText="%"
                sliderMin={0}
                sliderMax={10}
                sliderStep={0.25}
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
