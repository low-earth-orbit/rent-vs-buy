import { Fieldset, SimpleGrid, Stack } from "@mantine/core";
import UserInputFormItem from "./UserInputFormItem";

export default function UserInputForm({ userInput, handleChange }) {
  const bind = (id) => (value) => handleChange(id, value);

  return (
    <Stack gap="md">
      <Fieldset legend="Rent">
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
            step={0.1}
            value={userInput.rentIncreaseRate}
            onChange={bind("rentIncreaseRate")}
            appendText="%"
          />
        </SimpleGrid>
      </Fieldset>

      <Fieldset legend="Property">
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
            step={0.1}
            value={userInput.homePriceGrowthRate}
            onChange={bind("homePriceGrowthRate")}
            appendText="%"
          />
          <UserInputFormItem
            id="propertyTaxRate"
            label="Property Tax Rate"
            step={0.1}
            value={userInput.propertyTaxRate}
            onChange={bind("propertyTaxRate")}
            appendText="%"
          />
          <UserInputFormItem
            id="maintenanceCostPercentage"
            label="Maintenance"
            helperText="Annual maintenance cost as a percentage of home price."
            step={0.1}
            value={userInput.maintenanceCostPercentage}
            onChange={bind("maintenanceCostPercentage")}
            appendText="%"
          />
        </SimpleGrid>
      </Fieldset>

      <Fieldset legend="Mortgage">
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <UserInputFormItem
            id="downPaymentPercentage"
            label="Down Payment"
            step={5}
            min={5}
            max={100}
            value={userInput.downPaymentPercentage}
            onChange={bind("downPaymentPercentage")}
            appendText="%"
          />
          <UserInputFormItem
            id="annualMortgageInterestRate"
            label="Mortgage Rate"
            step={0.1}
            value={userInput.annualMortgageInterestRate}
            onChange={bind("annualMortgageInterestRate")}
            appendText="%"
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
            appendText="Years"
            disabled={userInput.downPaymentPercentage === 100}
          />
        </SimpleGrid>
      </Fieldset>

      <Fieldset legend="Investment & Tax">
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <UserInputFormItem
            id="investmentReturnRate"
            label="Total Portfolio Return"
            helperText="Expected pre-tax annual return, including both dividends and capital gains. Typical 80/20 growth ETF: ~6%."
            step={0.1}
            value={userInput.investmentReturnRate}
            onChange={bind("investmentReturnRate")}
            appendText="%"
          />
          <UserInputFormItem
            id="dividendYield"
            label="Dividend Yield"
            helperText="Portion of the total return paid as dividends each year, taxed annually. Remainder is capital appreciation deferred until sale."
            step={0.1}
            value={userInput.dividendYield}
            onChange={bind("dividendYield")}
            appendText="%"
          />
          <UserInputFormItem
            id="dividendTaxRate"
            label="Dividend Tax Rate"
            helperText="Effective tax rate on annual dividends. Eligible Canadian dividends ~25–30%; foreign dividends at marginal rate."
            step={1}
            value={userInput.dividendTaxRate}
            onChange={bind("dividendTaxRate")}
            appendText="%"
          />
          <UserInputFormItem
            id="investmentGainTax"
            label="Capital Gain Tax Rate"
            helperText="Tax rate applied to capital gains (total return minus dividends) when the portfolio is liquidated."
            step={1}
            value={userInput.investmentGainTax}
            onChange={bind("investmentGainTax")}
            appendText="%"
          />
        </SimpleGrid>
      </Fieldset>

      <Fieldset legend="Transaction Costs">
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <UserInputFormItem
            id="buyersClosingCostPercentage"
            label="Buyer's Closing Cost"
            helperText="Closing cost for home buyers as percentage of house price."
            step={0.1}
            value={userInput.buyersClosingCostPercentage}
            onChange={bind("buyersClosingCostPercentage")}
            appendText="%"
          />
          <UserInputFormItem
            id="sellersClosingCostPercentage"
            label="Seller's Closing Cost"
            helperText="Closing cost for home sellers as percentage of house price."
            step={0.1}
            value={userInput.sellersClosingCostPercentage}
            onChange={bind("sellersClosingCostPercentage")}
            appendText="%"
          />
        </SimpleGrid>
      </Fieldset>
    </Stack>
  );
}
