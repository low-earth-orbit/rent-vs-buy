import UserInputFormItem from "./UserInputFormItem";

export default function UserInputForm({ userInput, handleChange }) {
  return (
    <form id="form">
      <UserInputFormItem
        id="monthlyRent"
        label="Monthly Rent"
        step="100"
        max=""
        value={userInput.monthlyRent}
        onChange={(event) => {
          handleChange("monthlyRent", event.target.value);
        }}
        prependText="$"
        appendText=".00"
      />

      <UserInputFormItem
        id="initialHomePrice"
        label="Property Price"
        step="1000"
        max=""
        value={userInput.initialHomePrice}
        onChange={(event) => {
          handleChange("initialHomePrice", event.target.value);
        }}
        prependText="$"
        appendText=".00"
      />

      <UserInputFormItem
        id="propertyTaxRate"
        label="Property Tax Rate"
        step="0.1"
        value={userInput.propertyTaxRate}
        onChange={(event) => {
          handleChange("propertyTaxRate", event.target.value);
        }}
        appendText="%"
      />

      <UserInputFormItem
        id="maintenanceCostPercentage"
        label="Maintenance Cost"
        helperText="Enter annual maintenance cost as a percentage of home price. The default value is based on an estimated depreciation of
      1.5% plus additional expenditures."
        step="0.1"
        value={userInput.maintenanceCostPercentage}
        onChange={(event) => {
          handleChange("maintenanceCostPercentage", event.target.value);
        }}
        appendText="%"
      />

      <UserInputFormItem
        id="downPaymentPercentage"
        label="Down Payment"
        step="1"
        value={userInput.downPaymentPercentage}
        onChange={(event) => {
          handleChange("downPaymentPercentage", event.target.value);
        }}
        appendText="%"
      />

      <UserInputFormItem
        id="annualMortgageInterestRate"
        label="Mortgage Rate"
        helperText="The default value is based on a 2.75% neutral rate plus a 2%
      spread."
        step="0.1"
        value={userInput.annualMortgageInterestRate}
        onChange={(event) => {
          handleChange("annualMortgageInterestRate", event.target.value);
        }}
        appendText="%"
      />

      <UserInputFormItem
        id="loanTermYears"
        label="Mortgage Terms"
        step="5"
        min={5}
        max={30}
        value={userInput.loanTermYears}
        onChange={(event) => {
          handleChange("loanTermYears", event.target.value);
        }}
        appendText="Years"
      />

      <UserInputFormItem
        id="investmentReturnRate"
        label="Investment Return"
        helperText="Enter the expected pre-tax return of your investment portfolio. The default value is expected return of an 80/20 growth portfolio."
        step="0.1"
        value={userInput.investmentReturnRate}
        onChange={(event) => {
          handleChange("investmentReturnRate", event.target.value);
        }}
        appendText="%"
      />

      <UserInputFormItem
        id="capitalGainTaxOnInvestment"
        label="Capital Gain Tax"
        helperText="Typically half of your marginal income tax when you'll sell the property. The amount may be smaller as you can use TFSA, RRSP, etc. to shelter your investments."
        step="1"
        value={userInput.capitalGainTaxOnInvestment}
        onChange={(event) => {
          handleChange("capitalGainTaxOnInvestment", event.target.value);
        }}
        appendText="%"
      />

      <UserInputFormItem
        id="rentIncreaseRate"
        label="Rent Increase"
        helperText="The default value is 2% CPI inflation."
        step="0.1"
        value={userInput.rentIncreaseRate}
        onChange={(event) => {
          handleChange("rentIncreaseRate", event.target.value);
        }}
        appendText="%"
      />

      <UserInputFormItem
        id="homePriceGrowthRate"
        label="Home Price Appreciation"
        helperText="The default value is 3%, assuming 1% real price change based on historical data."
        step="0.1"
        value={userInput.homePriceGrowthRate}
        onChange={(event) => {
          handleChange("homePriceGrowthRate", event.target.value);
        }}
        appendText="%"
      />

      <UserInputFormItem
        id="buyersClosingCostPercentage"
        label="Buyer's Closing Cost"
        helperText="Enter closing cost for home buyers as percentage of house price."
        step="0.1"
        value={userInput.buyersClosingCostPercentage}
        onChange={(event) => {
          handleChange("buyersClosingCostPercentage", event.target.value);
        }}
        appendText="%"
      />

      <UserInputFormItem
        id="sellersClosingCostPercentage"
        label="Seller's Closing Cost"
        helperText="Enter closing cost for home sellers as percentage of house price. 5% is typical real estate agent commission."
        step="0.1"
        value={userInput.sellersClosingCostPercentage}
        onChange={(event) => {
          handleChange("sellersClosingCostPercentage", event.target.value);
        }}
        appendText="%"
      />
    </form>
  );
}
