import {
  Accordion,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import UserInputFormItem from "./UserInputFormItem";
import { PRESETS } from "../utils/presets";
import { FIELD_CONSTRAINTS } from "../utils/validation";

export default function UserInputForm({
  userInput,
  handleChange,
  handlePreset,
  errors,
}) {
  const bind = (id) => (value) => handleChange(id, value);
  const c = (id) => FIELD_CONSTRAINTS[id];

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
                value={userInput.monthlyRent}
                onChange={bind("monthlyRent")}
                error={errors.monthlyRent}
                prefix="$"
                thousandSeparator
                {...c("monthlyRent")}
              />
              <UserInputFormItem
                id="rentIncreaseRate"
                label="Rent Change"
                helperText="Expected annual change in rent. Historically tracks inflation (~2%). Can be negative."
                value={userInput.rentIncreaseRate}
                onChange={bind("rentIncreaseRate")}
                error={errors.rentIncreaseRate}
                suffix="%"
                {...c("rentIncreaseRate")}
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
                value={userInput.initialHomePrice}
                onChange={bind("initialHomePrice")}
                error={errors.initialHomePrice}
                prefix="$"
                thousandSeparator
                {...c("initialHomePrice")}
              />
              <UserInputFormItem
                id="homePriceGrowthRate"
                label="Home Price Change"
                helperText="Expected annual change in home price. Long-run world historical average is roughly 2–3.5% nominal. Can be negative."
                value={userInput.homePriceGrowthRate}
                onChange={bind("homePriceGrowthRate")}
                error={errors.homePriceGrowthRate}
                suffix="%"
                {...c("homePriceGrowthRate")}
              />
              <UserInputFormItem
                id="propertyTaxRate"
                label="Property Tax Rate"
                helperText="Annual property tax as a percentage of the home's market value. Typical range: 0.5–1.5% depending on municipality."
                value={userInput.propertyTaxRate}
                onChange={bind("propertyTaxRate")}
                error={errors.propertyTaxRate}
                suffix="%"
                {...c("propertyTaxRate")}
              />
              <UserInputFormItem
                id="maintenanceCostPercentage"
                label="Maintenance"
                helperText="Annual maintenance costs as a percentage of home price, including repairs, insurance, and condo fees (if applicable). Typically 1–2%, increasing as the home ages."
                value={userInput.maintenanceCostPercentage}
                onChange={bind("maintenanceCostPercentage")}
                error={errors.maintenanceCostPercentage}
                suffix="%"
                {...c("maintenanceCostPercentage")}
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
                helperText="Minimum is 5% in Canada. Down payments below 20% require CMHC mortgage insurance, which is added to the loan principal."
                value={userInput.downPaymentPercentage}
                onChange={bind("downPaymentPercentage")}
                error={errors.downPaymentPercentage}
                suffix="%"
                {...c("downPaymentPercentage")}
              />
              <UserInputFormItem
                id="annualMortgageInterestRate"
                label="Mortgage Rate"
                helperText="Annual mortgage interest rate. The default reflects the Bank of Canada's neutral policy rate (2.75%) plus a typical lender spread (1.75%)."
                value={userInput.annualMortgageInterestRate}
                onChange={bind("annualMortgageInterestRate")}
                error={errors.annualMortgageInterestRate}
                suffix="%"
                disabled={userInput.downPaymentPercentage === 100}
                {...c("annualMortgageInterestRate")}
              />
              <UserInputFormItem
                id="mortgageTerm"
                label="Mortgage Term"
                value={userInput.mortgageTerm}
                onChange={bind("mortgageTerm")}
                error={errors.mortgageTerm}
                suffix=" Years"
                disabled={userInput.downPaymentPercentage === 100}
                {...c("mortgageTerm")}
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
                helperText="Expected pre-tax annual return, including dividends and capital gains. Based on long-term capital market assumptions for a diversified growth portfolio (VGRO)."
                value={userInput.investmentReturnRate}
                onChange={bind("investmentReturnRate")}
                error={errors.investmentReturnRate}
                suffix="%"
                {...c("investmentReturnRate")}
              />
              <UserInputFormItem
                id="dividendYield"
                label="Dividend Yield"
                helperText="Portion of the total return paid as dividends each year, taxed annually. Remainder is capital appreciation deferred until sale."
                value={userInput.dividendYield}
                onChange={bind("dividendYield")}
                error={errors.dividendYield}
                suffix="%"
                {...c("dividendYield")}
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
              <UserInputFormItem
                id="investmentGainTax"
                label="Capital Gain Tax Rate"
                helperText="Tax rate on capital gains when the portfolio is sold. In Canada, 50% of gains are included in taxable income — multiply your marginal rate by 50% to get this number."
                value={userInput.investmentGainTax}
                onChange={bind("investmentGainTax")}
                error={errors.investmentGainTax}
                suffix="%"
                {...c("investmentGainTax")}
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
